# Calorie Bank

Budget your calories like money. **Calorie Bank** is a small full-stack app that
treats a daily calorie allowance as a bank balance: log food as *withdrawals*,
log activity as *deposits*, and watch your remaining balance for any day.

Built with [FastAPI](https://fastapi.tiangolo.com/) + SQLite on the backend and
a lightweight vanilla-JS single-page frontend served directly by FastAPI.

## Features

- Daily calorie budget you can edit on the fly
- Log food (withdrawals) and activity (deposits) as transactions
- Live balance ring that turns red when you go over budget
- Per-day ledger with a date picker; all data persisted in SQLite
- **Calorie Coach**: a built-in, rules-based advisor that reacts to your ledger
  in real time with a status (on track / heads up / over budget) and actionable
  tips — no API key or external service required
- **Goals**: choose Cut / Maintain / Bulk to tailor the Coach's advice
- **Food memory**: every food you log is remembered all-time; your most-used
  foods appear as one-tap quick-add chips
- **Food insights**: look back at what you've eaten the most and the least,
  with average calories per food
- **Favorites**: pin foods to keep them at the front of quick-add, with an
  editable "typical calories" value used to prefill quick-add
- **Trends**: a bar chart of net calories over flexible ranges (1–4 weeks, 3/6
  months, 1 year) with automatic day/week/month bucketing and a budget line
- **Per-food sparklines**: a mini calorie trend for each food in insights
- **Streak counter**: consecutive days logged, shown as a badge
- **Calendar heatmaps**: 1/3/6/12-month calendar views with multiple heatmap
  metrics (calories, budget adherence, activity), navigation, and click-a-day
  to jump the whole app to that date

## Requirements

- Python 3.11+

## Quick start

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Then open http://localhost:8000.

## API

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/summary?entry_date=YYYY-MM-DD` | Budget, totals, balance, and entries for a day |
| `GET` | `/api/coach?entry_date=YYYY-MM-DD` | Coach advice: status, headline, message, and tips for a day |
| `GET` | `/api/foods/frequent?limit=N` | Most-logged foods (all time) for one-tap re-logging |
| `GET` | `/api/foods/stats?limit=N` | All-time look-back: most- and least-eaten foods |
| `PUT` | `/api/foods/favorite` | Pin/unpin a food by name (`{name, favorite}`) |
| `PUT` | `/api/foods/typical` | Set/clear typical calories for a food (`{name, calories}`; `null` clears) |
| `GET` | `/api/trends?days=N&end=YYYY-MM-DD&bucket=auto\|day\|week\|month` | Net-calorie trend, auto-bucketed by day/week/month |
| `GET` | `/api/streak?end=YYYY-MM-DD` | Current consecutive-days-logged streak |
| `GET` | `/api/calendar?year=YYYY&month=M` | Per-day calorie data for a month (for calendar heatmaps) |
| `GET` | `/api/calendar/range?year=YYYY&month=M&months=N` | Last N months of calendar data (oldest-first) |
| `GET` | `/api/entries?entry_date=YYYY-MM-DD` | List entries (all if no date) |
| `POST` | `/api/entries` | Create an entry (`kind` = `food` \| `activity`) |
| `DELETE` | `/api/entries/{id}` | Delete an entry |
| `GET` | `/api/settings` | Get the daily budget and goal |
| `PUT` | `/api/settings` | Update the daily budget and/or goal (`cut` \| `maintain` \| `bulk`) |

Interactive API docs are available at http://localhost:8000/docs.

## Development

```bash
pip install -r requirements-dev.txt
pytest -q
```

The database path defaults to `data/calorie_bank.db` and can be overridden with
the `CALORIE_BANK_DB` environment variable (used by the test suite).
