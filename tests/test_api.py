"""End-to-end API tests for Calorie Bank using an isolated temp database."""

import importlib
import os

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("CALORIE_BANK_DB", str(tmp_path / "test.db"))
    import app.db as db
    import app.main as main

    importlib.reload(db)
    importlib.reload(main)
    with TestClient(main.app) as c:
        yield c


def test_default_budget(client):
    res = client.get("/api/settings")
    assert res.status_code == 200
    assert res.json()["daily_budget"] == 2000


def test_update_budget(client):
    res = client.put("/api/settings", json={"daily_budget": 2500})
    assert res.status_code == 200
    assert res.json()["daily_budget"] == 2500
    assert client.get("/api/settings").json()["daily_budget"] == 2500


def test_add_and_summary_balance(client):
    day = "2026-08-09"
    client.put("/api/settings", json={"daily_budget": 2000})
    client.post(
        "/api/entries",
        json={"entry_date": day, "kind": "food", "description": "Lunch", "calories": 800},
    )
    client.post(
        "/api/entries",
        json={"entry_date": day, "kind": "activity", "description": "Run", "calories": 300},
    )

    summary = client.get(f"/api/summary?entry_date={day}").json()
    assert summary["consumed"] == 800
    assert summary["earned"] == 300
    assert summary["available"] == 2300
    assert summary["balance"] == 1500
    assert len(summary["entries"]) == 2


def test_delete_entry(client):
    day = "2026-08-09"
    created = client.post(
        "/api/entries",
        json={"entry_date": day, "kind": "food", "description": "Snack", "calories": 150},
    ).json()
    entry_id = created["id"]

    assert client.delete(f"/api/entries/{entry_id}").status_code == 204
    assert client.delete(f"/api/entries/{entry_id}").status_code == 404
    assert client.get(f"/api/summary?entry_date={day}").json()["consumed"] == 0


def test_entries_are_date_scoped(client):
    client.post(
        "/api/entries",
        json={"entry_date": "2026-08-09", "kind": "food", "description": "A", "calories": 100},
    )
    client.post(
        "/api/entries",
        json={"entry_date": "2026-08-10", "kind": "food", "description": "B", "calories": 200},
    )
    assert client.get("/api/summary?entry_date=2026-08-09").json()["consumed"] == 100
    assert client.get("/api/summary?entry_date=2026-08-10").json()["consumed"] == 200


def test_settings_include_goal_default(client):
    settings = client.get("/api/settings").json()
    assert settings["daily_budget"] == 2000
    assert settings["goal"] == "maintain"


def test_update_goal_only_preserves_budget(client):
    client.put("/api/settings", json={"daily_budget": 1800})
    res = client.put("/api/settings", json={"goal": "cut"})
    assert res.status_code == 200
    body = res.json()
    assert body["goal"] == "cut"
    assert body["daily_budget"] == 1800


def test_invalid_goal_rejected(client):
    assert client.put("/api/settings", json={"goal": "bogus"}).status_code == 422


def test_coach_uses_stored_goal(client):
    client.put("/api/settings", json={"goal": "bulk"})
    client.post(
        "/api/entries",
        json={"entry_date": "2026-08-24", "kind": "food", "description": "Toast", "calories": 400},
    )
    advice = client.get("/api/coach?entry_date=2026-08-24").json()
    assert advice["goal"] == "bulk"


def test_frequent_foods_ranked_by_count(client):
    for day, cals in [("2026-08-20", 500), ("2026-08-21", 520), ("2026-08-22", 510)]:
        client.post(
            "/api/entries",
            json={"entry_date": day, "kind": "food", "description": "Oatmeal", "calories": cals},
        )
    client.post(
        "/api/entries",
        json={"entry_date": "2026-08-22", "kind": "food", "description": "Pizza", "calories": 900},
    )
    # Activity should be ignored by food memory.
    client.post(
        "/api/entries",
        json={"entry_date": "2026-08-22", "kind": "activity", "description": "Run", "calories": 300},
    )

    frequent = client.get("/api/foods/frequent?limit=6").json()
    assert frequent[0]["name"] == "Oatmeal"
    assert frequent[0]["count"] == 3
    assert frequent[0]["last_calories"] == 510
    assert frequent[0]["avg_calories"] == 510
    names = [f["name"] for f in frequent]
    assert "Pizza" in names and "Run" not in names


def test_food_grouping_is_case_insensitive(client):
    client.post(
        "/api/entries",
        json={"entry_date": "2026-08-20", "kind": "food", "description": "Apple", "calories": 95},
    )
    client.post(
        "/api/entries",
        json={"entry_date": "2026-08-21", "kind": "food", "description": "apple", "calories": 100},
    )
    frequent = client.get("/api/foods/frequent").json()
    apples = [f for f in frequent if f["name"].lower() == "apple"]
    assert len(apples) == 1
    assert apples[0]["count"] == 2


def test_food_stats_most_and_least(client):
    client.post(
        "/api/entries",
        json={"entry_date": "2026-08-20", "kind": "food", "description": "Salad", "calories": 300},
    )
    client.post(
        "/api/entries",
        json={"entry_date": "2026-08-21", "kind": "food", "description": "Salad", "calories": 320},
    )
    client.post(
        "/api/entries",
        json={"entry_date": "2026-08-22", "kind": "food", "description": "Cake", "calories": 450},
    )
    stats = client.get("/api/foods/stats").json()
    assert stats["total_unique"] == 2
    assert stats["total_food_entries"] == 3
    assert stats["most_eaten"][0]["name"] == "Salad"
    assert stats["least_eaten"][0]["name"] == "Cake"


def test_favorite_pins_food_to_front(client):
    for day in ["2026-08-20", "2026-08-21", "2026-08-22"]:
        client.post(
            "/api/entries",
            json={"entry_date": day, "kind": "food", "description": "Rice", "calories": 200},
        )
    client.post(
        "/api/entries",
        json={"entry_date": "2026-08-22", "kind": "food", "description": "Kiwi", "calories": 40},
    )
    # Rice (3x) outranks Kiwi (1x) by default.
    assert client.get("/api/foods/frequent").json()[0]["name"] == "Rice"

    res = client.put("/api/foods/favorite", json={"name": "Kiwi", "favorite": True})
    assert res.status_code == 200 and res.json()["favorite"] is True

    frequent = client.get("/api/foods/frequent").json()
    assert frequent[0]["name"] == "Kiwi"
    assert frequent[0]["favorite"] is True
    assert frequent[1]["name"] == "Rice"

    client.put("/api/foods/favorite", json={"name": "kiwi", "favorite": False})
    assert client.get("/api/foods/frequent").json()[0]["name"] == "Rice"


def test_trends_window_and_summary(client):
    client.put("/api/settings", json={"daily_budget": 1000})
    client.post(
        "/api/entries",
        json={"entry_date": "2026-08-22", "kind": "food", "description": "A", "calories": 1200},
    )
    client.post(
        "/api/entries",
        json={"entry_date": "2026-08-24", "kind": "food", "description": "B", "calories": 500},
    )
    client.post(
        "/api/entries",
        json={"entry_date": "2026-08-24", "kind": "activity", "description": "Run", "calories": 100},
    )

    trend = client.get("/api/trends?days=7&end=2026-08-24").json()
    assert trend["days"] == 7
    assert len(trend["points"]) == 7
    assert trend["start"] == "2026-08-18" and trend["end"] == "2026-08-24"

    by_date = {p["date"]: p for p in trend["points"]}
    assert by_date["2026-08-22"]["net"] == 1200 and by_date["2026-08-22"]["over"] is True
    assert by_date["2026-08-24"]["net"] == 400 and by_date["2026-08-24"]["over"] is False
    assert by_date["2026-08-23"]["logged"] is False

    assert trend["summary"]["days_logged"] == 2
    assert trend["summary"]["days_over"] == 1
    assert trend["summary"]["total_consumed"] == 1700
    assert trend["summary"]["avg_net"] == 800  # (1200 + 400) / 2


def test_coach_endpoint_reflects_ledger(client):
    day = "2026-08-24"
    client.put("/api/settings", json={"daily_budget": 2000})
    empty = client.get(f"/api/coach?entry_date={day}").json()
    assert empty["status"] == "empty"

    client.post(
        "/api/entries",
        json={"entry_date": day, "kind": "food", "description": "Big lunch", "calories": 2300},
    )
    over = client.get(f"/api/coach?entry_date={day}").json()
    assert over["status"] == "over"
    assert over["metrics"]["balance"] == -300
    assert over["headline"]
    assert isinstance(over["tips"], list) and over["tips"]


def test_validation_rejects_bad_kind(client):
    res = client.post(
        "/api/entries",
        json={"entry_date": "2026-08-09", "kind": "bogus", "description": "X", "calories": 100},
    )
    assert res.status_code == 422
