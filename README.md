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
| `GET` | `/api/entries?entry_date=YYYY-MM-DD` | List entries (all if no date) |
| `POST` | `/api/entries` | Create an entry (`kind` = `food` \| `activity`) |
| `DELETE` | `/api/entries/{id}` | Delete an entry |
| `GET` | `/api/settings` | Get the daily budget |
| `PUT` | `/api/settings` | Update the daily budget |

Interactive API docs are available at http://localhost:8000/docs.

## Development

```bash
pip install -r requirements-dev.txt
pytest -q
```

The database path defaults to `data/calorie_bank.db` and can be overridden with
the `CALORIE_BANK_DB` environment variable (used by the test suite).
