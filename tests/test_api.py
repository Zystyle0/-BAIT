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


def test_validation_rejects_bad_kind(client):
    res = client.post(
        "/api/entries",
        json={"entry_date": "2026-08-09", "kind": "bogus", "description": "X", "calories": 100},
    )
    assert res.status_code == 422
