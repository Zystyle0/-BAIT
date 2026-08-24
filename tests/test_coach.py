"""Unit tests for the rules-based Calorie Coach engine."""

from app.coach import build_advice


def make_summary(budget, consumed, earned, entries=None):
    available = budget + earned
    return {
        "date": "2026-08-24",
        "daily_budget": budget,
        "consumed": consumed,
        "earned": earned,
        "available": available,
        "balance": available - consumed,
        "entries": entries if entries is not None else [],
    }


def test_empty_day():
    advice = build_advice(make_summary(2000, 0, 0, entries=[]))
    assert advice["status"] == "empty"
    assert advice["tips"]
    assert "2,000" in advice["message"]


def test_on_track():
    entries = [{"kind": "food", "calories": 600}]
    advice = build_advice(make_summary(2000, 600, 0, entries=entries))
    assert advice["status"] == "good"
    assert advice["metrics"]["balance"] == 1400
    assert advice["metrics"]["meals_remaining"] == 2
    assert advice["metrics"]["pct_consumed"] == 30.0


def test_warning_near_limit():
    entries = [{"kind": "food", "calories": 1800}]
    advice = build_advice(make_summary(2000, 1800, 0, entries=entries))
    assert advice["status"] == "warning"
    assert advice["metrics"]["balance"] == 200
    assert any("lighter" in t.lower() for t in advice["tips"])


def test_over_budget_suggests_walk():
    entries = [{"kind": "food", "calories": 2300}]
    advice = build_advice(make_summary(2000, 2300, 0, entries=entries))
    assert advice["status"] == "over"
    assert advice["metrics"]["balance"] == -300
    # ~300 kcal over at 5 kcal/min -> ~60 min walk suggestion.
    assert any("60 min" in t for t in advice["tips"])


def test_activity_deposit_praised():
    entries = [
        {"kind": "food", "calories": 600},
        {"kind": "activity", "calories": 300},
    ]
    advice = build_advice(make_summary(2000, 600, 300, entries=entries))
    assert advice["status"] == "good"
    assert advice["metrics"]["available"] == 2300
    assert any("activity added" in t.lower() for t in advice["tips"])
