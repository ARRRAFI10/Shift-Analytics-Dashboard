import django_filters as filters

from shifts.models import ShiftRecord


class ReasonInFilter(filters.BaseInFilter, filters.CharFilter):
    """Comma-separated `reason` values -> category name IN (...)."""


class ShiftRecordFilter(filters.FilterSet):
    date_from = filters.DateFilter(field_name="day_date", lookup_expr="gte")
    date_to = filters.DateFilter(field_name="day_date", lookup_expr="lte")
    reason = ReasonInFilter(field_name="category__name", lookup_expr="in")
    group = filters.CharFilter(field_name="category__group", lookup_expr="iexact")
    productive = filters.BooleanFilter(field_name="category__is_productive")
    min_duration = filters.NumberFilter(field_name="duration_hours", lookup_expr="gte")

    class Meta:
        model = ShiftRecord
        fields = ["date_from", "date_to", "reason", "group", "productive", "min_duration"]
