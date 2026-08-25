"""Body composition engine for Calorie Bank.

Turns a series of body-composition measurements (weight, body-fat %, skeletal
muscle) into a goal-aware, baseline-relative report: per-metric direction
arrows, alignment with the chosen goal, a trend series, and a plain-language
interpretation of what the body is doing and what to adjust first.

This is deterministic and self-contained — the same "measure -> interpret ->
adjust" loop a coach would apply, expressed as math instead of sensors.
"""

from __future__ import annotations

from typing import Any

# Metrics we model. fat_mass_lb is derived from weight and body-fat %.
METRICS = ("weight_lb", "body_fat_pct", "skeletal_muscle_lb", "fat_mass_lb")

METRIC_LABELS = {
    "weight_lb": "Weight",
    "body_fat_pct": "Body fat %",
    "skeletal_muscle_lb": "Skeletal muscle",
    "fat_mass_lb": "Body fat mass",
}

METRIC_UNITS = {
    "weight_lb": "lb",
    "body_fat_pct": "%",
    "skeletal_muscle_lb": "lb",
    "fat_mass_lb": "lb",
}

# Minimum change (absolute) for a metric to count as moving rather than "flat".
FLAT_THRESHOLD = {
    "weight_lb": 0.5,
    "body_fat_pct": 0.2,
    "skeletal_muscle_lb": 0.3,
    "fat_mass_lb": 0.4,
}

# Each goal declares the acceptable directions per metric plus display labels.
GOALS: dict[str, dict[str, Any]] = {
    "lean_muscle_gain": {
        "label": "Lean Muscle Gain",
        "targets": {
            "skeletal_muscle_lb": ["up"],
            "weight_lb": ["up", "flat"],
            "fat_mass_lb": ["flat", "down"],
            "body_fat_pct": ["down", "flat"],
        },
        "target_labels": {
            "skeletal_muscle_lb": "⬆️ Skeletal muscle",
            "weight_lb": "➡️ / slight ⬆️ Weight",
            "fat_mass_lb": "➡️ Body fat mass",
            "body_fat_pct": "⬇️ or maintain Body fat %",
        },
    },
    "fat_loss": {
        "label": "Fat Loss",
        "targets": {
            "skeletal_muscle_lb": ["flat", "up"],
            "weight_lb": ["down"],
            "fat_mass_lb": ["down"],
            "body_fat_pct": ["down"],
        },
        "target_labels": {
            "skeletal_muscle_lb": "➡️ Preserve skeletal muscle",
            "weight_lb": "⬇️ Weight",
            "fat_mass_lb": "⬇️ Body fat mass",
            "body_fat_pct": "⬇️ Body fat %",
        },
    },
    "recomposition": {
        "label": "Recomposition",
        "targets": {
            "skeletal_muscle_lb": ["up", "flat"],
            "weight_lb": ["flat"],
            "fat_mass_lb": ["down"],
            "body_fat_pct": ["down"],
        },
        "target_labels": {
            "skeletal_muscle_lb": "⬆️ / ➡️ Skeletal muscle",
            "weight_lb": "➡️ Weight",
            "fat_mass_lb": "⬇️ Body fat mass",
            "body_fat_pct": "⬇️ Body fat %",
        },
    },
    "maintain": {
        "label": "Maintain",
        "targets": {
            "skeletal_muscle_lb": ["flat", "up"],
            "weight_lb": ["flat"],
            "fat_mass_lb": ["flat"],
            "body_fat_pct": ["flat"],
        },
        "target_labels": {
            "skeletal_muscle_lb": "➡️ Skeletal muscle",
            "weight_lb": "➡️ Weight",
            "fat_mass_lb": "➡️ Body fat mass",
            "body_fat_pct": "➡️ Body fat %",
        },
    },
    "performance": {
        "label": "Performance",
        "targets": {
            "skeletal_muscle_lb": ["up", "flat"],
            "weight_lb": ["flat", "up"],
            "fat_mass_lb": ["flat", "down"],
            "body_fat_pct": ["down", "flat"],
        },
        "target_labels": {
            "skeletal_muscle_lb": "⬆️ / ➡️ Skeletal muscle",
            "weight_lb": "➡️ / ⬆️ Weight",
            "fat_mass_lb": "➡️ / ⬇️ Body fat mass",
            "body_fat_pct": "⬇️ / ➡️ Body fat %",
        },
    },
}

ARROWS = {"up": "⬆️", "down": "⬇️", "flat": "➡️"}


def valid_goal(goal: str | None) -> str:
    return goal if goal in GOALS else "lean_muscle_gain"


def goals_catalog() -> list[dict]:
    return [
        {"key": key, "label": g["label"], "target_labels": g["target_labels"]}
        for key, g in GOALS.items()
    ]


def fat_mass(weight_lb: float, body_fat_pct: float) -> float:
    return round(weight_lb * body_fat_pct / 100.0, 1)


def _metrics_of(m: dict) -> dict[str, float]:
    return {
        "weight_lb": float(m["weight_lb"]),
        "body_fat_pct": float(m["body_fat_pct"]),
        "skeletal_muscle_lb": float(m["skeletal_muscle_lb"]),
        "fat_mass_lb": fat_mass(m["weight_lb"], m["body_fat_pct"]),
    }


def _direction(metric: str, delta: float) -> str:
    if abs(delta) < FLAT_THRESHOLD[metric]:
        return "flat"
    return "up" if delta > 0 else "down"


def _fmt(metric: str, value: float) -> str:
    unit = METRIC_UNITS[metric]
    return f"{value:g}{'' if unit == '%' else ' '}{unit}"


def _signed(value: float) -> str:
    return f"+{value:g}" if value > 0 else f"{value:g}"


def _interpretation(goal: str, changes: dict, latest_vals: dict, n: int) -> tuple[str, list[str], str]:
    """Return (status, notes, headline)."""
    aligned_flags = [c["aligned"] for c in changes.values()]
    aligned = sum(1 for a in aligned_flags if a)
    total = len(aligned_flags)

    if aligned == total:
        status = "on_track"
    elif aligned >= total - 1:
        status = "mixed"
    else:
        status = "off_track"

    muscle = changes["skeletal_muscle_lb"]
    bf = changes["body_fat_pct"]

    if bf["dir"] == "flat":
        bf_phrase = f"body-fat % held steady at {latest_vals['body_fat_pct']:g}%"
    elif bf["dir"] == "down":
        bf_phrase = f"body-fat % dropped {abs(bf['delta_baseline']):g} pts to {latest_vals['body_fat_pct']:g}%"
    else:
        bf_phrase = f"body-fat % rose {abs(bf['delta_baseline']):g} pts to {latest_vals['body_fat_pct']:g}%"

    headline = (
        f"{_signed(muscle['delta_baseline'])} lb skeletal muscle while {bf_phrase} "
        f"since your baseline ({n} scans)."
    )
    if status == "on_track":
        headline += " Your current nutrition/training strategy appears to be supporting your goal."
    elif status == "mixed":
        headline += " Mostly on track — one metric is drifting from target."
    else:
        headline += " The trend is diverging from your goal on several metrics."

    notes: list[str] = []
    if goal == "lean_muscle_gain":
        if not muscle["aligned"]:
            notes.append(
                "Skeletal muscle isn't increasing — ensure a small calorie surplus, "
                "adequate protein, and progressive training load."
            )
        if not changes["fat_mass_lb"]["aligned"] or changes["body_fat_pct"]["dir"] == "up":
            notes.append(
                "Fat mass / body-fat % are climbing — trim the surplus slightly "
                "(≈100–200 kcal) or add low-intensity activity to lean the gain out."
            )
    elif goal == "fat_loss":
        if not changes["weight_lb"]["aligned"] or not changes["fat_mass_lb"]["aligned"]:
            notes.append(
                "Weight / fat mass aren't trending down — increase the deficit modestly "
                "or add activity; keep the change small to protect muscle."
            )
        if changes["skeletal_muscle_lb"]["dir"] == "down":
            notes.append(
                "Muscle is dropping — raise protein and keep resistance training to "
                "preserve lean mass while cutting."
            )
    elif goal == "recomposition":
        if changes["skeletal_muscle_lb"]["dir"] == "down":
            notes.append("Muscle is slipping — prioritize protein and training volume.")
        if changes["fat_mass_lb"]["dir"] != "down":
            notes.append("Fat mass isn't falling — a slight deficit on rest days can help.")
    elif goal == "maintain":
        drifting = [METRIC_LABELS[k] for k, c in changes.items() if c["dir"] != "flat"]
        if drifting:
            notes.append(
                f"{', '.join(drifting)} drifting from steady — nudge calories toward "
                "maintenance to hold your composition."
            )
    elif goal == "performance":
        if changes["skeletal_muscle_lb"]["dir"] == "down":
            notes.append("Muscle/power base is dropping — check fueling and recovery load.")
        if changes["body_fat_pct"]["dir"] == "up":
            notes.append("Body-fat % is rising — tighten nutrition to keep power-to-weight.")

    if status == "on_track" and not notes:
        notes.append("Keep doing what you're doing and re-measure in 2–4 weeks.")

    return status, notes[:2], headline


def build_report(measurements: list[dict], goal: str) -> dict[str, Any]:
    """Build a goal-aware body-composition report from ordered measurements."""
    goal = valid_goal(goal)
    g = GOALS[goal]
    goal_block = {"key": goal, "label": g["label"], "target_labels": g["target_labels"]}

    ordered = sorted(measurements, key=lambda m: (m["entry_date"], m["id"]))
    trend = []
    for m in ordered:
        vals = _metrics_of(m)
        trend.append({"date": m["entry_date"], "id": m["id"], **vals})

    if not ordered:
        return {
            "goal": goal_block,
            "goals_catalog": goals_catalog(),
            "status": "empty",
            "headline": "Log your first body-composition measurement to start tracking.",
            "notes": [],
            "latest": None,
            "baseline": None,
            "changes": {},
            "trend": [],
            "count": 0,
        }

    baseline_vals = _metrics_of(ordered[0])
    latest_vals = _metrics_of(ordered[-1])
    prev_vals = _metrics_of(ordered[-2]) if len(ordered) >= 2 else baseline_vals

    changes = {}
    for metric in METRICS:
        delta_base = round(latest_vals[metric] - baseline_vals[metric], 1)
        delta_prev = round(latest_vals[metric] - prev_vals[metric], 1)
        direction = _direction(metric, delta_base)
        aligned = direction in g["targets"][metric]
        changes[metric] = {
            "label": METRIC_LABELS[metric],
            "unit": METRIC_UNITS[metric],
            "value": latest_vals[metric],
            "delta_baseline": delta_base,
            "delta_prev": delta_prev,
            "dir": direction,
            "arrow": ARROWS[direction],
            "aligned": aligned,
        }

    if len(ordered) < 2:
        status = "baseline"
        headline = "Baseline set. Log another measurement to see your trend and interpretation."
        notes = ["Aim to measure under similar conditions (time of day, hydration) for consistency."]
    else:
        status, notes, headline = _interpretation(goal, changes, latest_vals, len(ordered))

    return {
        "goal": goal_block,
        "goals_catalog": goals_catalog(),
        "status": status,
        "headline": headline,
        "notes": notes,
        "latest": {"date": ordered[-1]["entry_date"], **latest_vals},
        "baseline": {"date": ordered[0]["entry_date"], **baseline_vals},
        "changes": changes,
        "trend": trend,
        "count": len(ordered),
    }
