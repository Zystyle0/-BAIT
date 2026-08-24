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


class BudgetIn(BaseModel):
    daily_budget: int = Field(..., ge=0, le=20000)


def _get_budget(conn) -> int:
    row = conn.execute(
        "SELECT value FROM settings WHERE key = 'daily_budget'"
    ).fetchone()
    return int(row["value"]) if row else 2000


@app.get("/api/settings")
def get_settings() -> dict:
    with get_connection() as conn:
        return {"daily_budget": _get_budget(conn)}


@app.put("/api/settings")
def update_settings(payload: BudgetIn) -> dict:
    with get_connection() as conn:
        conn.execute(
            "UPDATE settings SET value = ? WHERE key = 'daily_budget'",
            (str(payload.daily_budget),),
        )
        return {"daily_budget": payload.daily_budget}


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
    return build_advice(summary(entry_date))


app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/")
def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")
