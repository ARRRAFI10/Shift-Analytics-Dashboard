from datetime import datetime, timezone

import pytest

from shifts.models import ActivityCategory, ShiftRecord


def utc(year, month, day, hour, minute=0):
    return datetime(year, month, day, hour, minute, tzinfo=timezone.utc)


@pytest.fixture
def categories(db):
    breakdown = ActivityCategory.objects.create(name="Breakdown", is_productive=False)
    unknown = ActivityCategory.objects.create(
        name="Unknown Failure", is_productive=False
    )
    training = ActivityCategory.objects.create(name="Training", is_productive=True)
    cleaning = ActivityCategory.objects.create(
        name="Cleaning", group="Housekeeping", is_productive=True
    )
    setup = ActivityCategory.objects.create(
        name="Setup", group="Housekeeping", is_productive=True
    )
    return {
        "Breakdown": breakdown,
        "Unknown Failure": unknown,
        "Training": training,
        "Cleaning": cleaning,
        "Setup": setup,
    }


@pytest.fixture
def make_record(categories):
    def _make(day, start, end, reason="Training", status=ShiftRecord.Status.CLEAN):
        duration = (end - start).total_seconds() / 3600
        return ShiftRecord.objects.create(
            day_date=day,
            start=start,
            end=end,
            duration_hours=duration,
            stated_hours=duration,
            category=categories[reason],
            status=status,
        )

    return _make
