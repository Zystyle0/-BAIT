"""Calorie Coach — a self-contained, rules-based advice engine.

Given a day's summary (the same shape returned by ``/api/summary``), it produces
friendly, deterministic coaching: a status, a headline, a message, and a short
list of actionable tips. No external services or API keys required.
"""

from __future__ import annotations

from typing import Any

# Rough planning constants used for human-friendly estimates.
AVG_MEAL_KCAL = 600
# Approximate calories burned per minute of brisk walking.
WALK_KCAL_PER_MIN = 5
# Fraction of the available budget under which we warn the user.
LOW_BALANCE_FRACTION = 0.15


VALID_GOALS = ("cut", "maintain", "bulk")


def _walk_minutes(kcal: int) -> int:
    return max(1, round(kcal / WALK_KCAL_PER_MIN))


def _goal_tip(goal: str, status: str, pct_consumed: float, balance: int) -> str | None:
    """A goal-specific nudge appended to the coach's tips."""
    if goal == "cut":
        if status == "over":
            return "This works against your cut — offsetting it with activity keeps you in a deficit."
        if status in ("good", "warning"):
            return "Leaving a buffer under budget keeps you in the deficit your cut needs."
    elif goal == "bulk":
        if status == "over":
            return "A modest surplus is on-plan for your bulk — just keep it intentional."
        if status == "good" and pct_consumed < 60:
            return "For your bulk you have plenty of room — add a snack or shake to hit your target."
        if status == "empty":
            return "Bulking means eating consistently — aim to meet (or slightly beat) your budget today."
    return None


def build_advice(summary: dict[str, Any], goal: str = "maintain") -> dict[str, Any]:
    """Turn a daily summary into coaching advice.

    ``summary`` must contain ``daily_budget``, ``consumed``, ``earned``,
    ``available``, ``balance`` and ``entries`` (as produced by the summary API).
    ``goal`` is one of ``cut``, ``maintain`` or ``bulk`` and tailors the tips.
    """
    goal = goal if goal in VALID_GOALS else "maintain"
    budget = int(summary["daily_budget"])
    consumed = int(summary["consumed"])
    earned = int(summary["earned"])
    available = int(summary["available"])
    balance = int(summary["balance"])
    entries = summary.get("entries", []) or []

    food_count = sum(1 for e in entries if e.get("kind") == "food")
    activity_count = sum(1 for e in entries if e.get("kind") == "activity")

    pct_consumed = round((consumed / available) * 100, 1) if available > 0 else 100.0
    meals_remaining = balance // AVG_MEAL_KCAL if balance > 0 else 0

    tips: list[str] = []

    if not entries:
        status = "empty"
        headline = "Ready when you are"
        message = (
            f"No transactions yet today. You have {budget:,} kcal to spend — "
            "log your first meal to start tracking."
        )
        tips.append(
            "Log activity like a walk or run to deposit extra calories into your budget."
        )
        tips.append(
            f"A typical meal is around {AVG_MEAL_KCAL:,} kcal, so plan for roughly "
            f"{budget // AVG_MEAL_KCAL} today."
        )
    elif balance < 0:
        over = -balance
        status = "over"
        headline = "Over budget"
        message = f"You're {over:,} kcal over budget for today."
        tips.append(
            f"A ~{_walk_minutes(over)} min brisk walk (~{over:,} kcal) would bring you "
            "back to even — log it as a deposit."
        )
        tips.append("Keep any remaining food light to limit how far over you go.")
        if food_count and activity_count == 0:
            tips.append("You haven't logged any activity yet today — even a short walk helps.")
    elif available > 0 and balance <= LOW_BALANCE_FRACTION * available:
        status = "warning"
        headline = "Almost at your limit"
        message = (
            f"You've used {pct_consumed:g}% of today's budget — only {balance:,} kcal left."
        )
        tips.append("Choose a lighter option for your next meal to stay on track.")
        if earned == 0:
            tips.append("Log some activity to free up more room in your budget.")
    else:
        status = "good"
        headline = "On track"
        meal_word = "meal" if meals_remaining == 1 else "meals"
        message = (
            f"{balance:,} kcal left today ({pct_consumed:g}% used) — room for about "
            f"{meals_remaining} more {meal_word}."
        )
        if earned > 0:
            tips.append(f"Nice work — activity added {earned:,} kcal back to your budget.")
        if consumed > 0 and activity_count == 0:
            tips.append("Add a walk or workout to earn extra calories to spend.")
        if not tips:
            tips.append("You're pacing well. Keep logging as you go.")

    goal_tip = _goal_tip(goal, status, pct_consumed, balance)
    if goal_tip:
        tips.append(goal_tip)

    return {
        "date": summary.get("date"),
        "goal": goal,
        "status": status,
        "headline": headline,
        "message": message,
        "tips": tips,
        "metrics": {
            "daily_budget": budget,
            "consumed": consumed,
            "earned": earned,
            "available": available,
            "balance": balance,
            "pct_consumed": pct_consumed,
            "meals_remaining": meals_remaining,
        },
    }
