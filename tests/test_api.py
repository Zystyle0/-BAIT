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
    assert settings["composition_goal"] == "lean_muscle_gain"


def test_composition_goal_update_and_validation(client):
    res = client.put("/api/settings", json={"composition_goal": "fat_loss"})
    assert res.status_code == 200 and res.json()["composition_goal"] == "fat_loss"
    assert client.put("/api/settings", json={"composition_goal": "bogus"}).status_code == 422


def test_body_measurement_crud_and_report(client):
    created = client.post(
        "/api/body",
        json={"entry_date": "2026-05-01", "weight_lb": 165.0, "body_fat_pct": 12.0, "skeletal_muscle_lb": 84.0},
    ).json()
    assert created["fat_mass_lb"] == 19.8

    client.post(
        "/api/body",
        json={"entry_date": "2026-08-01", "weight_lb": 168.2, "body_fat_pct": 10.5, "skeletal_muscle_lb": 86.2},
    )

    listing = client.get("/api/body").json()
    assert len(listing) == 2 and listing[0]["entry_date"] == "2026-05-01"

    client.put("/api/settings", json={"composition_goal": "lean_muscle_gain"})
    report = client.get("/api/body/report").json()
    assert report["count"] == 2
    assert report["status"] == "on_track"
    assert report["changes"]["skeletal_muscle_lb"]["delta_baseline"] == 2.2
    assert report["goal"]["key"] == "lean_muscle_gain"

    mid = created["id"]
    assert client.delete(f"/api/body/{mid}").status_code == 204
    assert client.delete(f"/api/body/{mid}").status_code == 404
    assert len(client.get("/api/body").json()) == 1


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


def test_streak_counts_consecutive_days(client):
    for day in ["2026-08-22", "2026-08-23", "2026-08-24"]:
        client.post(
            "/api/entries",
            json={"entry_date": day, "kind": "food", "description": "X", "calories": 100},
        )
    res = client.get("/api/streak?end=2026-08-24").json()
    assert res["streak"] == 3
    assert res["logged_today"] is True


def test_streak_today_gap_anchors_yesterday(client):
    for day in ["2026-08-22", "2026-08-23"]:
        client.post(
            "/api/entries",
            json={"entry_date": day, "kind": "food", "description": "X", "calories": 100},
        )
    # Nothing logged on 2026-08-24 yet; streak should still count 22-23.
    res = client.get("/api/streak?end=2026-08-24").json()
    assert res["streak"] == 2
    assert res["logged_today"] is False


def test_streak_breaks_on_gap(client):
    for day in ["2026-08-20", "2026-08-21", "2026-08-24"]:
        client.post(
            "/api/entries",
            json={"entry_date": day, "kind": "food", "description": "X", "calories": 100},
        )
    res = client.get("/api/streak?end=2026-08-24").json()
    assert res["streak"] == 1  # 23 empty breaks the run


def test_typical_calories_override_and_clear(client):
    for day, cals in [("2026-08-20", 600), ("2026-08-21", 650)]:
        client.post(
            "/api/entries",
            json={"entry_date": day, "kind": "food", "description": "Bowl", "calories": cals},
        )
    bowl = next(f for f in client.get("/api/foods/frequent").json() if f["name"] == "Bowl")
    assert bowl["typical_calories"] == 650  # defaults to last
    assert bowl["typical_custom"] is False

    client.put("/api/foods/typical", json={"name": "Bowl", "calories": 700})
    bowl = next(f for f in client.get("/api/foods/frequent").json() if f["name"] == "Bowl")
    assert bowl["typical_calories"] == 700 and bowl["typical_custom"] is True

    client.put("/api/foods/typical", json={"name": "bowl", "calories": None})
    bowl = next(f for f in client.get("/api/foods/frequent").json() if f["name"] == "Bowl")
    assert bowl["typical_calories"] == 650 and bowl["typical_custom"] is False


def test_food_history_series(client):
    cals = [500, 520, 480]
    for i, c in enumerate(cals):
        client.post(
            "/api/entries",
            json={"entry_date": f"2026-08-2{i}", "kind": "food", "description": "Wrap", "calories": c},
        )
    wrap = next(f for f in client.get("/api/foods/frequent").json() if f["name"] == "Wrap")
    assert wrap["history"] == cals  # chronological order


def test_calendar_month_structure(client):
    client.put("/api/settings", json={"daily_budget": 1000})
    client.post(
        "/api/entries",
        json={"entry_date": "2026-08-05", "kind": "food", "description": "A", "calories": 1300},
    )
    client.post(
        "/api/entries",
        json={"entry_date": "2026-08-05", "kind": "activity", "description": "Run", "calories": 200},
    )
    client.post(
        "/api/entries",
        json={"entry_date": "2026-08-20", "kind": "food", "description": "B", "calories": 400},
    )

    cal = client.get("/api/calendar?year=2026&month=8").json()
    assert cal["num_days"] == 31
    assert cal["month_name"] == "August"
    assert cal["lead_blanks"] == 6  # Aug 1 2026 is a Saturday (Sunday-start)
    assert len(cal["days"]) == 31

    by_day = {d["day"]: d for d in cal["days"]}
    assert by_day[5]["consumed"] == 1300 and by_day[5]["earned"] == 200
    assert by_day[5]["net"] == 1100 and by_day[5]["over"] is True
    assert by_day[20]["net"] == 400 and by_day[20]["over"] is False
    assert by_day[1]["logged"] is False

    assert cal["summary"]["logged_days"] == 2
    assert cal["summary"]["days_over"] == 1


def test_calendar_rejects_bad_month(client):
    assert client.get("/api/calendar?year=2026&month=13").status_code == 422


def test_calendar_range_returns_months_oldest_first(client):
    rng = client.get("/api/calendar/range?year=2026&month=8&months=3").json()
    assert rng["months"] == 3
    names = [(m["year"], m["month"]) for m in rng["data"]]
    assert names == [(2026, 6), (2026, 7), (2026, 8)]


def test_calendar_range_crosses_year_boundary(client):
    rng = client.get("/api/calendar/range?year=2026&month=2&months=4").json()
    names = [(m["year"], m["month"]) for m in rng["data"]]
    assert names == [(2025, 11), (2025, 12), (2026, 1), (2026, 2)]


def test_trends_auto_buckets_by_range(client):
    day = client.get("/api/trends?days=7&end=2026-08-25").json()
    assert day["bucket"] == "day" and len(day["points"]) == 7
    assert "date" in day["points"][0] and "label" in day["points"][0]

    week = client.get("/api/trends?days=90&end=2026-08-25").json()
    assert week["bucket"] == "week" and len(week["points"]) == 13

    month = client.get("/api/trends?days=365&end=2026-08-25").json()
    assert month["bucket"] == "month" and len(month["points"]) == 13


def test_trends_week_bucket_averages_daily_net(client):
    client.put("/api/settings", json={"daily_budget": 2000})
    # Two logged days in the trailing week window ending 2026-08-25.
    client.post(
        "/api/entries",
        json={"entry_date": "2026-08-24", "kind": "food", "description": "A", "calories": 1000},
    )
    client.post(
        "/api/entries",
        json={"entry_date": "2026-08-25", "kind": "food", "description": "B", "calories": 1400},
    )
    trend = client.get("/api/trends?days=60&end=2026-08-25&bucket=week").json()
    assert trend["bucket"] == "week"
    last = trend["points"][-1]
    # avg daily net over the two logged days in the final week = (1000+1400)/2.
    assert last["net"] == 1200
    assert last["logged"] is True


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
