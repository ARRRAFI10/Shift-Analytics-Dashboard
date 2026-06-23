from shifts.services.cleaning import CleaningConfig, clean

CONFIG = CleaningConfig(hours_tolerance=0.1, max_shift_hours=16.0)


def run(rows):
    return clean(rows, CONFIG)


def issue_types(result, action=None):
    return {
        i.issue_type for i in result.issues
        if action is None or i.action_taken == action
    }


def test_clean_row_passes_through():
    rows = [("2025-10-21", "2025-10-21T07:00:00Z", "2025-10-21T10:30:00Z", 3.5, "Training")]
    result = run(rows)
    assert len(result.records) == 1
    record = result.records[0]
    assert record.status == "clean"
    assert record.duration_hours == 3.5
    assert not result.issues


def test_hours_mismatch_is_corrected():
    # Stated 10.5h but the timestamps span ~2.9h.
    rows = [("2025-10-07", "2025-10-07T09:45:00Z", "2025-10-07T12:39:00Z", 10.5, "Power Failure")]
    result = run(rows)
    assert result.records[0].status == "corrected"
    assert abs(result.records[0].duration_hours - 2.9) < 1e-6
    assert "hours_mismatch" in issue_types(result, "corrected")


def test_negative_stated_hours_is_corrected():
    rows = [("2025-10-08", "2025-10-08T17:45:00Z", "2025-10-08T20:27:00Z", -3.0, "Other")]
    result = run(rows)
    assert result.records[0].status == "corrected"
    assert result.records[0].duration_hours > 0
    assert "negative_stated_hours" in issue_types(result, "corrected")


def test_missing_timestamp_is_quarantined():
    rows = [("2025-10-12", None, "2025-10-12T18:28:00Z", 3.3, "Breakdown")]
    result = run(rows)
    assert not result.records
    assert "missing_timestamp" in issue_types(result, "quarantined")


def test_unparseable_timestamp_is_quarantined():
    rows = [("2025-10-01", "invalid-time", "2025-10-01T08:24:00Z", 1.4, "Breakdown")]
    result = run(rows)
    assert not result.records
    assert "unparseable_timestamp" in issue_types(result, "quarantined")


def test_invalid_day_date_recovered_from_start():
    rows = [("2025-15-55", "2025-10-07T15:15:00Z", "2025-10-07T16:39:00Z", 1.4, "Cleaning")]
    result = run(rows)
    assert len(result.records) == 1
    record = result.records[0]
    assert record.status == "corrected"
    assert record.day_date.isoformat() == "2025-10-07"
    assert "invalid_day_date" in issue_types(result, "corrected")


def test_end_before_start_is_quarantined():
    rows = [("2025-10-04", "2025-10-05T08:00:00Z", "2025-10-04T07:30:00Z", 0.9, "Quality Check")]
    result = run(rows)
    assert not result.records
    assert "non_positive_duration" in issue_types(result, "quarantined")


def test_implausible_duration_is_quarantined():
    # ~24.5h span exceeds the 16h ceiling.
    rows = [("2025-10-04", "2025-10-04T07:30:00Z", "2025-10-05T08:00:00Z", 0.9, "Quality Check")]
    result = run(rows)
    assert not result.records
    assert "implausible_duration" in issue_types(result, "quarantined")


def test_exact_duplicate_is_quarantined_once():
    row = ("2025-10-20", "2025-10-20T07:30:00Z", "2025-10-20T09:30:00Z", 2.0, "Cleaning")
    result = run([row, row])
    assert len(result.records) == 1
    assert "duplicate_row" in issue_types(result, "quarantined")


def test_same_day_overlap_is_flagged_but_kept():
    rows = [
        ("2025-10-08", "2025-10-08T08:00:00Z", "2025-10-08T11:00:00Z", 3.0, "Training"),
        ("2025-10-08", "2025-10-08T10:00:00Z", "2025-10-08T12:00:00Z", 2.0, "Cleaning"),
    ]
    result = run(rows)
    assert len(result.records) == 2  # overlaps are retained
    assert "same_day_overlap" in issue_types(result, "flagged")


def test_whitespace_in_reason_is_trimmed():
    rows = [("2025-10-21", "2025-10-21T07:00:00Z", "2025-10-21T10:30:00Z", 3.5, "  Training  ")]
    result = run(rows)
    assert result.records[0].reason == "Training"
