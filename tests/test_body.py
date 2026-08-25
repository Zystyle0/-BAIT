"""Unit tests for the body-composition interpretation engine."""

from app.body import build_report, fat_mass


def m(i, date, w, bf, smm):
    return {"id": i, "entry_date": date, "weight_lb": w, "body_fat_pct": bf, "skeletal_muscle_lb": smm}


def test_empty_report():
    r = build_report([], "lean_muscle_gain")
    assert r["status"] == "empty"
    assert r["count"] == 0
    assert r["latest"] is None


def test_single_measurement_is_baseline():
    r = build_report([m(1, "2026-05-01", 165, 12, 84)], "lean_muscle_gain")
    assert r["status"] == "baseline"
    assert r["latest"]["weight_lb"] == 165
    assert r["changes"]["weight_lb"]["delta_baseline"] == 0.0


def test_fat_mass_derivation():
    assert fat_mass(168.2, 10.5) == 17.7
    r = build_report([m(1, "2026-05-01", 200, 20, 90)], "maintain")
    assert r["latest"]["fat_mass_lb"] == 40.0


def test_lean_gain_on_track():
    scans = [
        m(1, "2026-05-01", 165.0, 12.0, 84.0),
        m(2, "2026-06-01", 166.4, 11.4, 85.0),
        m(3, "2026-08-01", 168.2, 10.5, 86.2),
    ]
    r = build_report(scans, "lean_muscle_gain")
    assert r["status"] == "on_track"
    assert r["changes"]["skeletal_muscle_lb"]["dir"] == "up"
    assert r["changes"]["skeletal_muscle_lb"]["aligned"] is True
    assert r["changes"]["body_fat_pct"]["dir"] == "down"
    assert "skeletal muscle" in r["headline"]
    assert r["changes"]["skeletal_muscle_lb"]["delta_baseline"] == 2.2


def test_lean_gain_off_track_when_fat_climbs():
    # Muscle flat, weight + fat mass + body fat % all climbing = off goal.
    scans = [
        m(1, "2026-05-01", 165.0, 12.0, 84.0),
        m(2, "2026-08-01", 175.0, 16.0, 84.1),
    ]
    r = build_report(scans, "lean_muscle_gain")
    assert r["status"] in ("mixed", "off_track")
    assert r["changes"]["skeletal_muscle_lb"]["aligned"] is False
    assert r["notes"]  # actionable guidance present


def test_same_data_different_goal_changes_alignment():
    scans = [
        m(1, "2026-05-01", 180.0, 22.0, 82.0),
        m(2, "2026-08-01", 172.0, 17.0, 81.6),
    ]
    fat = build_report(scans, "fat_loss")
    assert fat["changes"]["weight_lb"]["aligned"] is True  # weight down is good for fat loss
    gain = build_report(scans, "lean_muscle_gain")
    # weight down is NOT desired for lean muscle gain
    assert gain["changes"]["weight_lb"]["aligned"] is False


def test_flat_threshold_keeps_small_changes_steady():
    scans = [
        m(1, "2026-05-01", 168.0, 10.5, 86.0),
        m(2, "2026-08-01", 168.2, 10.55, 86.1),  # tiny changes
    ]
    r = build_report(scans, "maintain")
    assert r["changes"]["weight_lb"]["dir"] == "flat"
    assert r["changes"]["body_fat_pct"]["dir"] == "flat"
    assert r["status"] == "on_track"
