from datetime import date

import pytest

from shifts.services.analytics import (
    compute_efficiency,
    compute_insights,
    compute_reason_breakdown,
    compute_streaks,
)
from shifts.models import ShiftRecord
from shifts.tests.conftest import utc

pytestmark = pytest.mark.django_db


def test_efficiency_overall_and_per_day(make_record):
    # Day 1: 3h productive (Training) + 1h non-productive (Breakdown) -> 75%.
    make_record(date(2025, 10, 1), utc(2025, 10, 1, 7), utc(2025, 10, 1, 10), "Training")
    make_record(date(2025, 10, 1), utc(2025, 10, 1, 11), utc(2025, 10, 1, 12), "Breakdown")
    # Day 2: 2h productive only -> 100%.
    make_record(date(2025, 10, 2), utc(2025, 10, 2, 8), utc(2025, 10, 2, 10), "Training")

    result = compute_efficiency(ShiftRecord.objects.all())
    assert result["overall"]["total_hours"] == 6.0
    assert result["overall"]["productive_hours"] == 5.0
    assert result["overall"]["score"] == pytest.approx(83.33, abs=0.01)

    per_day = {d["date"]: d for d in result["per_day"]}
    assert per_day["2025-10-01"]["score"] == 75.0
    assert per_day["2025-10-02"]["score"] == 100.0


def test_efficiency_handles_empty():
    result = compute_efficiency(ShiftRecord.objects.none())
    assert result["overall"]["score"] == 0.0
    assert result["per_day"] == []


def test_streak_detection_consecutive_days(make_record):
    # Breakdown on Oct 1, 2, 3 (a 3-day streak) and again on Oct 6 (isolated).
    for day in (1, 2, 3, 6):
        make_record(date(2025, 10, day), utc(2025, 10, day, 9), utc(2025, 10, day, 11), "Breakdown")
    # A non-target category on Oct 2 must not affect the streak.
    make_record(date(2025, 10, 2), utc(2025, 10, 2, 12), utc(2025, 10, 2, 13), "Training")

    streaks = compute_streaks(ShiftRecord.objects.all())
    assert len(streaks) == 1  # the isolated single day is below min length
    streak = streaks[0]
    assert streak["start_date"] == "2025-10-01"
    assert streak["end_date"] == "2025-10-03"
    assert streak["length_days"] == 3
    assert streak["total_hours"] == 6.0


def test_streak_respects_min_days(make_record):
    make_record(date(2025, 10, 1), utc(2025, 10, 1, 9), utc(2025, 10, 1, 11), "Breakdown")
    streaks = compute_streaks(ShiftRecord.objects.all(), min_days=2)
    assert streaks == []


def test_reason_breakdown_switches_dimension(make_record):
    make_record(date(2025, 10, 1), utc(2025, 10, 1, 7), utc(2025, 10, 1, 9), "Cleaning")
    make_record(date(2025, 10, 1), utc(2025, 10, 1, 9), utc(2025, 10, 1, 12), "Setup")

    by_reason = compute_reason_breakdown(ShiftRecord.objects.all(), "reason")
    assert {b["key"] for b in by_reason} == {"Cleaning", "Setup"}

    # Both Cleaning and Setup share the Housekeeping group.
    by_group = compute_reason_breakdown(ShiftRecord.objects.all(), "group")
    assert len(by_group) == 1
    assert by_group[0]["key"] == "Housekeeping"
    assert by_group[0]["total_hours"] == 5.0
    assert by_group[0]["record_count"] == 2


def test_insights_are_computed(make_record):
    for day in (1, 2):
        make_record(date(2025, 10, day), utc(2025, 10, day, 9), utc(2025, 10, day, 12), "Breakdown")
    make_record(date(2025, 10, 1), utc(2025, 10, 1, 13), utc(2025, 10, 1, 15), "Training")

    insights = compute_insights(ShiftRecord.objects.all())
    types = {i["type"] for i in insights}
    assert {"top_downtime_reason", "worst_day", "worst_streak"} <= types
    assert all(i["message"] for i in insights)
