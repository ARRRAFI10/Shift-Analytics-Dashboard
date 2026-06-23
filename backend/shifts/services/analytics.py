"""Analytics over the clean + corrected dataset.

Every function takes a `ShiftRecord` queryset (already filtered by the API layer)
and returns plain serialisable structures. All ratios guard against empty inputs
and division by zero so filtered views that match nothing degrade gracefully.
"""

from __future__ import annotations

from collections import defaultdict
from datetime import date, timedelta
from typing import Any, Iterable

from django.conf import settings
from django.db.models import QuerySet

from shifts.colors import color_for_category
from shifts.models import ShiftRecord


def _records(records: QuerySet[ShiftRecord] | Iterable[ShiftRecord]) -> list[ShiftRecord]:
    if isinstance(records, QuerySet):
        return list(records.select_related("category"))
    return list(records)


def _safe_score(productive: float, total: float) -> float:
    return round(productive / total * 100, 2) if total else 0.0


def compute_efficiency(records: QuerySet[ShiftRecord]) -> dict[str, Any]:
    rows = _records(records)
    total = productive = 0.0
    per_day: dict[date, list[float]] = defaultdict(lambda: [0.0, 0.0])  # [productive, total]

    for r in rows:
        total += r.duration_hours
        per_day[r.day_date][1] += r.duration_hours
        if r.category.is_productive:
            productive += r.duration_hours
            per_day[r.day_date][0] += r.duration_hours

    daily = [
        {
            "date": day.isoformat(),
            "productive_hours": round(prod, 2),
            "non_productive_hours": round(tot - prod, 2),
            "total_hours": round(tot, 2),
            "score": _safe_score(prod, tot),
        }
        for day, (prod, tot) in sorted(per_day.items())
    ]

    return {
        "overall": {
            "productive_hours": round(productive, 2),
            "non_productive_hours": round(total - productive, 2),
            "total_hours": round(total, 2),
            "score": _safe_score(productive, total),
            "record_count": len(rows),
        },
        "per_day": daily,
    }


def compute_streaks(
    records: QuerySet[ShiftRecord],
    target_category: str | None = None,
    min_days: int | None = None,
) -> list[dict[str, Any]]:
    target = target_category or settings.STREAK_TARGET_CATEGORY
    minimum = settings.MIN_STREAK_DAYS if min_days is None else min_days

    day_hours: dict[date, float] = defaultdict(float)
    for r in _records(records):
        if r.category.name == target:
            day_hours[r.day_date] += r.duration_hours

    streaks: list[dict[str, Any]] = []
    current: list[date] = []

    def flush() -> None:
        if len(current) >= minimum:
            streaks.append(
                {
                    "category": target,
                    "start_date": current[0].isoformat(),
                    "end_date": current[-1].isoformat(),
                    "length_days": len(current),
                    "total_hours": round(sum(day_hours[d] for d in current), 2),
                }
            )

    for day in sorted(day_hours):
        if current and day - current[-1] == timedelta(days=1):
            current.append(day)
        else:
            flush()
            current = [day]
    flush()

    return sorted(streaks, key=lambda s: s["total_hours"], reverse=True)


def compute_reason_breakdown(
    records: QuerySet[ShiftRecord], dimension: str = "reason"
) -> list[dict[str, Any]]:
    by_group = dimension == "group"
    buckets: dict[str, dict[str, Any]] = {}

    for r in _records(records):
        # Fall back to the reason name when a category has no group, so ungrouped
        # reasons still appear individually instead of collapsing into one blank.
        key = (r.category.group or r.category.name) if by_group else r.category.name
        bucket = buckets.setdefault(
            key,
            {
                "key": key,
                "total_hours": 0.0,
                "record_count": 0,
                "is_productive": r.category.is_productive,
                "color": color_for_category(key),
            },
        )
        bucket["total_hours"] += r.duration_hours
        bucket["record_count"] += 1

    for bucket in buckets.values():
        bucket["total_hours"] = round(bucket["total_hours"], 2)

    return sorted(buckets.values(), key=lambda b: b["total_hours"], reverse=True)


def compute_insights(records: QuerySet[ShiftRecord]) -> list[dict[str, Any]]:
    rows = _records(records)
    insights: list[dict[str, Any]] = []
    if not rows:
        return insights

    # (a) Biggest downtime driver: top non-productive reason by hours.
    downtime: dict[str, float] = defaultdict(float)
    total_downtime = 0.0
    for r in rows:
        if not r.category.is_productive:
            downtime[r.category.name] += r.duration_hours
            total_downtime += r.duration_hours

    if total_downtime > 0:
        reason, hours = max(downtime.items(), key=lambda kv: kv[1])
        share = round(hours / total_downtime * 100, 1)
        insights.append(
            {
                "type": "top_downtime_reason",
                "title": "Biggest downtime driver",
                "metric": f"{round(hours, 1)}h",
                "message": (
                    f"'{reason}' accounts for {round(hours, 1)}h ({share}% of all "
                    f"downtime). Target it first to lift efficiency."
                ),
            }
        )

    # (b) Worst day by efficiency.
    efficiency = compute_efficiency(records)
    if efficiency["per_day"]:
        worst = min(efficiency["per_day"], key=lambda d: d["score"])
        insights.append(
            {
                "type": "worst_day",
                "title": "Lowest-efficiency day",
                "metric": f"{worst['score']}%",
                "message": (
                    f"{worst['date']} ran at {worst['score']}% efficiency with "
                    f"{worst['non_productive_hours']}h of non-productive time. "
                    f"Review what happened that day."
                ),
            }
        )

    # (c) Most costly breakdown streak.
    streaks = compute_streaks(records)
    if streaks:
        top = streaks[0]
        insights.append(
            {
                "type": "worst_streak",
                "title": "Most costly breakdown streak",
                "metric": f"{top['total_hours']}h",
                "message": (
                    f"{top['category']} ran {top['length_days']} days straight "
                    f"({top['start_date']} → {top['end_date']}), costing "
                    f"{top['total_hours']}h. Investigate the root cause."
                ),
            }
        )

    return insights
