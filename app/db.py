"""SQLite persistence layer for Calorie Bank.

The database file location can be overridden with the ``CALORIE_BANK_DB``
environment variable, which keeps tests and ephemeral runs isolated from the
default on-disk database.
"""

from __future__ import annotations

import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

DEFAULT_DB_PATH = Path(__file__).resolve().parent.parent / "data" / "calorie_bank.db"


def get_db_path() -> Path:
    override = os.environ.get("CALORIE_BANK_DB")
    return Path(override) if override else DEFAULT_DB_PATH


@contextmanager
def get_connection() -> Iterator[sqlite3.Connection]:
    path = get_db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    """Create tables and seed defaults. Safe to run repeatedly."""
    with get_connection() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS settings (
                key   TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS entries (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                entry_date  TEXT NOT NULL,
                kind        TEXT NOT NULL CHECK (kind IN ('food', 'activity')),
                description TEXT NOT NULL,
                calories    INTEGER NOT NULL CHECK (calories >= 0),
                created_at  TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(entry_date);
            """
        )
        conn.execute(
            "INSERT OR IGNORE INTO settings(key, value) VALUES ('daily_budget', '2000')"
        )
