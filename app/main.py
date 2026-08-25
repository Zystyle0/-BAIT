"""Calorie Bank — a calorie budgeting app with a banking metaphor.

Log food as *withdrawals* and activity as *deposits* against a daily calorie
budget, and track your remaining balance for any day.
"""

from __future__ import annotations

import calendar as calmod
from contextlib import asynccontextmanager
from datetime import date, timedelta
from pathlib import Path

from fastapi import FastAPI, HTTPException, Response
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from . import body as bodylib
from .coach import build_advice
from .db import get_connection, init_db

STATIC_DIR = Path(__file__).resolve().parent / "static"


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(title="Calorie Bank", version="1.0.0", lifespan=lifespan)


@app.middleware("http")
async def no_store_assets(request, call_next):
    """Serve the SPA and its static assets uncached so updates always show."""
    response = await call_next(request)
    path = request.url.path
    if path == "/" or path.startswith("/static"):
        response.headers["Cache-Control"] = "no-store"
    return response


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
    composition_goal: str | None = Field(
        None, pattern="^(lean_muscle_gain|fat_loss|recomposition|maintain|performance)$"
    )


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


def _get_composition_goal(conn) -> str:
    return bodylib.valid_goal(_get_setting(conn, "composition_goal", "lean_muscle_gain"))


def _set_setting(conn, key: str, value: str) -> None:
    conn.execute(
        "INSERT INTO settings(key, value) VALUES (?, ?) "
        "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        (key, value),
    )


def _settings_dict(conn) -> dict:
    return {
        "daily_budget": _get_budget(conn),
        "goal": _get_goal(conn),
        "composition_goal": _get_composition_goal(conn),
    }


@app.get("/api/settings")
def get_settings() -> dict:
    with get_connection() as conn:
        return _settings_dict(conn)


@app.put("/api/settings")
def update_settings(payload: SettingsIn) -> dict:
    with get_connection() as conn:
        if payload.daily_budget is not None:
            _set_setting(conn, "daily_budget", str(payload.daily_budget))
        if payload.goal is not None:
            _set_setting(conn, "goal", payload.goal)
        if payload.composition_goal is not None:
            _set_setting(conn, "composition_goal", payload.composition_goal)
        return _settings_dict(conn)


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


# Keep only the most recent N calorie values for each food's sparkline.
FOOD_HISTORY_LIMIT = 12


def _favorites(conn) -> set[str]:
    return {
        row["name_key"]
        for row in conn.execute("SELECT name_key FROM food_favorites").fetchall()
    }


def _typicals(conn) -> dict[str, int]:
    return {
        row["name_key"]: int(row["calories"])
        for row in conn.execute("SELECT name_key, calories FROM food_typical").fetchall()
    }


def _food_stats(conn) -> list[dict]:
    """Aggregate every food entry (all time) by normalized name.

    Foods are grouped case-insensitively on their description. The most recent
    logging of a food wins for its display name and its "last" calories.
    """
    rows = conn.execute(
        "SELECT description, calories, entry_date FROM entries "
        "WHERE kind = 'food' ORDER BY id ASC"
    ).fetchall()
    favorites = _favorites(conn)
    typicals = _typicals(conn)
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
                "history": [],
            },
        )
        item["count"] += 1
        item["total_calories"] += int(r["calories"])
        item["name"] = name  # most recent (rows are id-ascending) wins
        item["last_calories"] = int(r["calories"])
        item["last_eaten"] = r["entry_date"]
        item["history"].append(int(r["calories"]))
    foods = list(agg.values())
    for item in foods:
        key = item["name"].lower()
        item["avg_calories"] = round(item["total_calories"] / item["count"])
        item["favorite"] = key in favorites
        item["history"] = item["history"][-FOOD_HISTORY_LIMIT:]
        # Typical calories used to prefill quick-add: user override, else last.
        item["typical_calories"] = typicals.get(key, item["last_calories"])
        item["typical_custom"] = key in typicals
    foods.sort(key=lambda x: (-x["count"], -x["total_calories"], x["name"].lower()))
    return foods


class FavoriteIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    favorite: bool = True


class TypicalIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    # None clears the override and falls back to the last logged value.
    calories: int | None = Field(None, ge=0, le=20000)


@app.put("/api/foods/favorite")
def set_favorite(payload: FavoriteIn) -> dict:
    """Pin or unpin a food by name (case-insensitive)."""
    key = payload.name.strip().lower()
    with get_connection() as conn:
        if payload.favorite:
            conn.execute(
                "INSERT OR IGNORE INTO food_favorites(name_key) VALUES (?)", (key,)
            )
        else:
            conn.execute("DELETE FROM food_favorites WHERE name_key = ?", (key,))
    return {"name": payload.name.strip(), "favorite": payload.favorite}


@app.put("/api/foods/typical")
def set_typical(payload: TypicalIn) -> dict:
    """Set (or clear) the typical calories used to prefill quick-add for a food."""
    key = payload.name.strip().lower()
    with get_connection() as conn:
        if payload.calories is None:
            conn.execute("DELETE FROM food_typical WHERE name_key = ?", (key,))
        else:
            conn.execute(
                "INSERT INTO food_typical(name_key, calories) VALUES (?, ?) "
                "ON CONFLICT(name_key) DO UPDATE SET calories = excluded.calories",
                (key, payload.calories),
            )
    return {"name": payload.name.strip(), "typical_calories": payload.calories}


@app.get("/api/foods/frequent")
def frequent_foods(limit: int = 6) -> list[dict]:
    """Foods for one-tap re-logging: favorites first, then most-logged."""
    limit = max(1, min(limit, 50))
    with get_connection() as conn:
        foods = _food_stats(conn)
    foods.sort(
        key=lambda x: (not x["favorite"], -x["count"], -x["total_calories"], x["name"].lower())
    )
    return foods[:limit]


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


def _auto_bucket(days: int) -> str:
    if days <= 31:
        return "day"
    if days <= 168:
        return "week"
    return "month"


def _bucket_points(daily: list[dict], mode: str, budget: int) -> list[dict]:
    """Collapse a list of per-day points into day/week/month buckets.

    Each bucket reports the *average daily net* over its logged days so it stays
    comparable to the daily budget reference line.
    """
    def summarize(chunk: list[dict], label: str) -> dict:
        logged = [p for p in chunk if p["logged"]]
        n = len(logged)
        avg_net = round(sum(p["net"] for p in logged) / n) if n else 0
        return {
            "label": label,
            "start": chunk[0]["date"],
            "end": chunk[-1]["date"],
            "net": avg_net,
            "logged": n > 0,
            "over": n > 0 and avg_net > budget,
            "days_logged": n,
        }

    if mode == "day":
        out = []
        for p in daily:
            d = date.fromisoformat(p["date"])
            label = d.strftime("%a") if len(daily) <= 14 else str(d.day)
            out.append({**p, "label": label})
        return out

    buckets: list[dict] = []
    if mode == "week":
        for i in range(0, len(daily), 7):
            chunk = daily[i : i + 7]
            start = date.fromisoformat(chunk[0]["date"])
            buckets.append(summarize(chunk, f"{start.month}/{start.day}"))
        return buckets

    # month
    groups: dict[str, list[dict]] = {}
    order: list[str] = []
    for p in daily:
        d = date.fromisoformat(p["date"])
        key = f"{d.year}-{d.month:02d}"
        if key not in groups:
            groups[key] = []
            order.append(key)
        groups[key].append(p)
    for key in order:
        chunk = groups[key]
        start = date.fromisoformat(chunk[0]["date"])
        buckets.append(summarize(chunk, start.strftime("%b")))
    return buckets


@app.get("/api/trends")
def trends(days: int = 7, end: str | None = None, bucket: str = "auto") -> dict:
    """Calorie trend over a trailing window, bucketed by day/week/month."""
    days = max(1, min(days, 366))
    end_date = date.fromisoformat(end) if end else date.today()
    start_date = end_date - timedelta(days=days - 1)
    with get_connection() as conn:
        budget = _get_budget(conn)
        rows = conn.execute(
            "SELECT entry_date, kind, COALESCE(SUM(calories), 0) AS total "
            "FROM entries WHERE entry_date BETWEEN ? AND ? GROUP BY entry_date, kind",
            (start_date.isoformat(), end_date.isoformat()),
        ).fetchall()

    by_day: dict[str, dict[str, int]] = {}
    for r in rows:
        by_day.setdefault(r["entry_date"], {})[r["kind"]] = int(r["total"])

    daily = []
    for offset in range(days):
        d = (start_date + timedelta(days=offset)).isoformat()
        consumed = by_day.get(d, {}).get("food", 0)
        earned = by_day.get(d, {}).get("activity", 0)
        net = consumed - earned
        logged = d in by_day
        daily.append(
            {
                "date": d,
                "consumed": consumed,
                "earned": earned,
                "net": net,
                "logged": logged,
                "over": logged and net > budget,
            }
        )

    mode = bucket if bucket in ("day", "week", "month") else _auto_bucket(days)
    points = _bucket_points(daily, mode, budget)

    logged_days = [p for p in daily if p["logged"]]
    days_logged = len(logged_days)
    total_consumed = sum(p["consumed"] for p in daily)
    avg_net = round(sum(p["net"] for p in logged_days) / days_logged) if days_logged else 0
    avg_consumed = round(total_consumed / days_logged) if days_logged else 0

    return {
        "days": days,
        "start": start_date.isoformat(),
        "end": end_date.isoformat(),
        "bucket": mode,
        "daily_budget": budget,
        "points": points,
        "summary": {
            "days_logged": days_logged,
            "days_over": sum(1 for p in logged_days if p["over"]),
            "total_consumed": total_consumed,
            "avg_net": avg_net,
            "avg_consumed": avg_consumed,
        },
    }


def _month_data(conn, y: int, m: int) -> dict:
    num_days = calmod.monthrange(y, m)[1]
    first = date(y, m, 1)
    last = date(y, m, num_days)
    budget = _get_budget(conn)
    rows = conn.execute(
        "SELECT entry_date, kind, COALESCE(SUM(calories), 0) AS total "
        "FROM entries WHERE entry_date BETWEEN ? AND ? GROUP BY entry_date, kind",
        (first.isoformat(), last.isoformat()),
    ).fetchall()

    by_day: dict[str, dict[str, int]] = {}
    for r in rows:
        by_day.setdefault(r["entry_date"], {})[r["kind"]] = int(r["total"])

    days = []
    for d in range(1, num_days + 1):
        ds = date(y, m, d).isoformat()
        consumed = by_day.get(ds, {}).get("food", 0)
        earned = by_day.get(ds, {}).get("activity", 0)
        logged = ds in by_day
        net = consumed - earned
        days.append(
            {
                "day": d,
                "date": ds,
                "consumed": consumed,
                "earned": earned,
                "net": net,
                "logged": logged,
                "over": logged and net > budget,
            }
        )

    return {
        "year": y,
        "month": m,
        "month_name": first.strftime("%B"),
        "daily_budget": budget,
        "num_days": num_days,
        # Sunday-start calendars: number of blank cells before day 1.
        "lead_blanks": (first.weekday() + 1) % 7,
        "days": days,
        "summary": {
            "logged_days": sum(1 for x in days if x["logged"]),
            "days_over": sum(1 for x in days if x["over"]),
            "consumed_total": sum(x["consumed"] for x in days),
        },
    }


@app.get("/api/calendar")
def calendar_month(year: int | None = None, month: int | None = None) -> dict:
    """Per-day calorie data for a month, for calendar heatmaps."""
    today = date.today()
    y = year or today.year
    m = month or today.month
    if not (1 <= m <= 12):
        raise HTTPException(status_code=422, detail="month must be 1-12")
    with get_connection() as conn:
        return _month_data(conn, y, m)


@app.get("/api/calendar/range")
def calendar_range(
    year: int | None = None, month: int | None = None, months: int = 3
) -> dict:
    """Return the last ``months`` months of calendar data ending at year/month.

    Months are returned oldest-first so they read left-to-right / top-to-bottom.
    """
    today = date.today()
    y = year or today.year
    m = month or today.month
    if not (1 <= m <= 12):
        raise HTTPException(status_code=422, detail="month must be 1-12")
    months = max(1, min(months, 12))
    result = []
    with get_connection() as conn:
        for back in range(months - 1, -1, -1):
            total = (y * 12 + (m - 1)) - back
            yy, mm = divmod(total, 12)
            result.append(_month_data(conn, yy, mm + 1))
    return {"months": months, "end_year": y, "end_month": m, "data": result}


@app.get("/api/streak")
def streak(end: str | None = None) -> dict:
    """Current run of consecutive days (ending today/yesterday) with any entry.

    A not-yet-logged current day does not break the streak: if ``end`` has no
    entries, the count anchors on the previous day instead.
    """
    end_date = date.fromisoformat(end) if end else date.today()
    with get_connection() as conn:
        logged = {
            row["entry_date"]
            for row in conn.execute(
                "SELECT DISTINCT entry_date FROM entries"
            ).fetchall()
        }

    anchor = end_date
    if anchor.isoformat() not in logged:
        anchor = anchor - timedelta(days=1)

    count = 0
    cursor = anchor
    while cursor.isoformat() in logged:
        count += 1
        cursor -= timedelta(days=1)

    return {
        "end": end_date.isoformat(),
        "streak": count,
        "logged_today": end_date.isoformat() in logged,
    }


class BodyMeasurementIn(BaseModel):
    entry_date: str = Field(..., description="ISO date, e.g. 2026-08-25")
    weight_lb: float = Field(..., gt=0, le=1500)
    body_fat_pct: float = Field(..., ge=0, le=75)
    skeletal_muscle_lb: float = Field(..., ge=0, le=800)


def _body_row(row) -> dict:
    d = dict(row)
    d["fat_mass_lb"] = bodylib.fat_mass(d["weight_lb"], d["body_fat_pct"])
    return d


@app.get("/api/body")
def list_body() -> list[dict]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM body_measurements ORDER BY entry_date ASC, id ASC"
        ).fetchall()
        return [_body_row(r) for r in rows]


@app.post("/api/body", status_code=201)
def create_body(payload: BodyMeasurementIn) -> dict:
    with get_connection() as conn:
        cur = conn.execute(
            "INSERT INTO body_measurements(entry_date, weight_lb, body_fat_pct, "
            "skeletal_muscle_lb) VALUES (?, ?, ?, ?)",
            (
                payload.entry_date,
                payload.weight_lb,
                payload.body_fat_pct,
                payload.skeletal_muscle_lb,
            ),
        )
        row = conn.execute(
            "SELECT * FROM body_measurements WHERE id = ?", (cur.lastrowid,)
        ).fetchone()
        return _body_row(row)


@app.delete("/api/body/{measurement_id}")
def delete_body(measurement_id: int) -> Response:
    with get_connection() as conn:
        cur = conn.execute(
            "DELETE FROM body_measurements WHERE id = ?", (measurement_id,)
        )
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Measurement not found")
    return Response(status_code=204)


@app.get("/api/body/report")
def body_report() -> dict:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM body_measurements ORDER BY entry_date ASC, id ASC"
        ).fetchall()
        goal = _get_composition_goal(conn)
    return bodylib.build_report([dict(r) for r in rows], goal)


app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/")
def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")
