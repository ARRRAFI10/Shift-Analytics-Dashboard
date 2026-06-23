from rest_framework import serializers

from shifts.colors import color_for_category
from shifts.models import (
    ActivityCategory,
    Dataset,
    IngestionIssue,
    ShiftRecord,
)


class ActivityCategorySerializer(serializers.ModelSerializer):
    color = serializers.SerializerMethodField()

    class Meta:
        model = ActivityCategory
        fields = ["id", "name", "group", "is_productive", "color"]

    def get_color(self, obj: ActivityCategory) -> str:
        return color_for_category(obj.name)


class ShiftRecordSerializer(serializers.ModelSerializer):
    reason = serializers.CharField(source="category.name", read_only=True)
    group = serializers.CharField(source="category.group", read_only=True)
    is_productive = serializers.BooleanField(
        source="category.is_productive", read_only=True
    )
    color = serializers.SerializerMethodField()

    class Meta:
        model = ShiftRecord
        fields = [
            "id", "day_date", "start", "end", "duration_hours", "stated_hours",
            "reason", "group", "is_productive", "status", "color",
        ]

    def get_color(self, obj: ShiftRecord) -> str:
        return color_for_category(obj.category.name)


class ShiftChartSerializer(serializers.ModelSerializer):
    date = serializers.DateField(source="day_date")
    reason = serializers.CharField(source="category.name")
    color = serializers.SerializerMethodField()
    start_time = serializers.SerializerMethodField()
    end_time = serializers.SerializerMethodField()
    start_hour = serializers.SerializerMethodField()
    end_hour = serializers.SerializerMethodField()

    class Meta:
        model = ShiftRecord
        fields = [
            "id", "date", "start", "end", "start_time", "end_time",
            "start_hour", "end_hour", "duration_hours", "reason", "color",
        ]

    def get_color(self, obj: ShiftRecord) -> str:
        return color_for_category(obj.category.name)

    def get_start_time(self, obj: ShiftRecord) -> str:
        return obj.start.strftime("%H:%M")

    def get_end_time(self, obj: ShiftRecord) -> str:
        return obj.end.strftime("%H:%M")

    def get_start_hour(self, obj: ShiftRecord) -> float:
        # Hour-of-day offset (UTC) used as the floating bar's lower bound. End may
        # exceed 24 when a shift crosses midnight; the chart's axis adapts to that.
        return round(obj.start.hour + obj.start.minute / 60, 4)

    def get_end_hour(self, obj: ShiftRecord) -> float:
        start = obj.start.hour + obj.start.minute / 60
        return round(start + obj.duration_hours, 4)


class IngestionIssueSerializer(serializers.ModelSerializer):
    class Meta:
        model = IngestionIssue
        fields = [
            "id", "row_index", "raw_data", "issue_type", "description",
            "action_taken", "created_at",
        ]


class DatasetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Dataset
        fields = [
            "id", "filename", "source", "record_count", "issue_count",
            "actions", "is_active", "created_at",
        ]
