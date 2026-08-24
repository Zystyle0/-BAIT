"""Calorie Bank — a calorie budgeting app with a banking metaphor.

Log food as *withdrawals* and activity as *deposits* against a daily calorie
budget, and track your remaining balance for any day.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import date
from pathlib import Path

from fastapi import FastAPI, HTTPException, Response
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from .coach import build_advice
from .db import get_connection, init_db

STATIC_DIR = Path(__file__).resolve().parent / "static"


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(title="Calorie Bank", version="1.0.0", lifespan=lifespan)


class EntryIn(BaseModel):
    entry_date: str = Field(..., description="ISO date, e.g. 2026-08-09")
    kind: str = Field(..., pattern="^(food|activity)$")
    description: str = Field(..., min_length=1, max_length=120)
    calories: int = Field(..., ge=0, le=20000)


class Entry(EntryIn):
    id: int
    created_at: str


VALID_GOALS = ("cut", "maintain", "bulk")


class SettingsIn(BaseModel):
    daily_budget: int | None = Field(None, ge=0, le=20000)
    goal: str | None = Field(None, pattern="^(cut|maintain|bulk)$")


def _get_setting(conn, key: str, default: str) -> str:
    row = conn.execute(
        "SELECT value FROM settings WHERE key = ?", (key,)
    ).fetchone()
    return row["value"] if row else default


def _get_budget(conn) -> int:
    return int(_get_setting(conn, "daily_budget", "2000"))


def _get_goal(conn) -> str:
    goal = _get_setting(conn, "goal", "maintain")
    return goal if goal in VALID_GOALS else "maintain"


def _set_setting(conn, key: str, value: str) -> None:
    conn.execute(
        "INSERT INTO settings(key, value) VALUES (?, ?) "
        "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        (key, value),
    )


@app.get("/api/settings")
def get_settings() -> dict:
    with get_connection() as conn:
        return {"daily_budget": _get_budget(conn), "goal": _get_goal(conn)}


@app.put("/api/settings")
def update_settings(payload: SettingsIn) -> dict:
    with get_connection() as conn:
        if payload.daily_budget is not None:
            _set_setting(conn, "daily_budget", str(payload.daily_budget))
        if payload.goal is not None:
            _set_setting(conn, "goal", payload.goal)
        return {"daily_budget": _get_budget(conn), "goal": _get_goal(conn)}


@app.get("/api/entries")
def list_entries(entry_date: str | None = None) -> list[dict]:
    with get_connection() as conn:
        if entry_date:
            rows = conn.execute(
                "SELECT * FROM entries WHERE entry_date = ? ORDER BY id DESC",
                (entry_date,),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM entries ORDER BY id DESC"
            ).fetchall()
        return [dict(row) for row in rows]


@app.post("/api/entries", status_code=201)
def create_entry(payload: EntryIn) -> dict:
    with get_connection() as conn:
        cur = conn.execute(
            "INSERT INTO entries(entry_date, kind, description, calories) "
            "VALUES (?, ?, ?, ?)",
            (payload.entry_date, payload.kind, payload.description, payload.calories),
        )
        row = conn.execute(
            "SELECT * FROM entries WHERE id = ?", (cur.lastrowid,)
        ).fetchone()
        return dict(row)


@app.delete("/api/entries/{entry_id}")
def delete_entry(entry_id: int) -> Response:
    with get_connection() as conn:
        cur = conn.execute("DELETE FROM entries WHERE id = ?", (entry_id,))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Entry not found")
    return Response(status_code=204)


@app.get("/api/summary")
def summary(entry_date: str | None = None) -> dict:
    day = entry_date or date.today().isoformat()
    with get_connection() as conn:
        budget = _get_budget(conn)
        rows = conn.execute(
            "SELECT kind, COALESCE(SUM(calories), 0) AS total "
            "FROM entries WHERE entry_date = ? GROUP BY kind",
            (day,),
        ).fetchall()
        totals = {row["kind"]: row["total"] for row in rows}
        consumed = int(totals.get("food", 0))
        earned = int(totals.get("activity", 0))
        available = budget + earned
        balance = available - consumed
        entries = [
            dict(r)
            for r in conn.execute(
                "SELECT * FROM entries WHERE entry_date = ? ORDER BY id DESC",
                (day,),
            ).fetchall()
        ]
        return {
            "date": day,
            "daily_budget": budget,
            "consumed": consumed,
            "earned": earned,
            "available": available,
            "balance": balance,
            "entries": entries,
        }


@app.get("/api/coach")
def coach(entry_date: str | None = None) -> dict:
    """Rules-based coaching advice for the given day's ledger."""
    with get_connection() as conn:
        goal = _get_goal(conn)
    return build_advice(summary(entry_date), goal=goal)


def _food_stats(conn) -> list[dict]:
    """Aggregate every food entry (all time) by normalized name.

    Foods are grouped case-insensitively on their description. The most recent
    logging of a food wins for its display name and its "last" calories.
    """
    rows = conn.execute(
        "SELECT description, calories, entry_date FROM entries "
        "WHERE kind = 'food' ORDER BY id ASC"
    ).fetchall()
    agg: dict[str, dict] = {}
    for r in rows:
        name = r["description"].strip()
        key = name.lower()
        item = agg.setdefault(
            key,
            {
                "name": name,
                "count": 0,
                "total_calories": 0,
                "last_calories": 0,
                "last_eaten": None,
            },
        )
        item["count"] += 1
        item["total_calories"] += int(r["calories"])
        item["name"] = name  # most recent (rows are id-ascending) wins
        item["last_calories"] = int(r["calories"])
        item["last_eaten"] = r["entry_date"]
    foods = list(agg.values())
    for item in foods:
        item["avg_calories"] = round(item["total_calories"] / item["count"])
    foods.sort(key=lambda x: (-x["count"], -x["total_calories"], x["name"].lower()))
    return foods


@app.get("/api/foods/frequent")
def frequent_foods(limit: int = 6) -> list[dict]:
    """Most-logged foods (all time) for one-tap re-logging."""
    limit = max(1, min(limit, 50))
    with get_connection() as conn:
        return _food_stats(conn)[:limit]


@app.get("/api/foods/stats")
def food_insights(limit: int = 5) -> dict:
    """All-time look-back: most- and least-eaten foods."""
    limit = max(1, min(limit, 50))
    with get_connection() as conn:
        foods = _food_stats(conn)
    least = sorted(
        foods, key=lambda x: (x["count"], x["total_calories"], x["name"].lower())
    )
    return {
        "total_unique": len(foods),
        "total_food_entries": sum(f["count"] for f in foods),
        "most_eaten": foods[:limit],
        "least_eaten": least[:limit],
    }


app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/")
def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")
