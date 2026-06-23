from django.contrib import admin

from shifts.models import (
    ActivityCategory,
    Dataset,
    IngestionIssue,
    ShiftRecord,
)


@admin.register(ActivityCategory)
class ActivityCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "group", "is_productive")
    list_filter = ("is_productive", "group")
    search_fields = ("name", "group")


@admin.register(ShiftRecord)
class ShiftRecordAdmin(admin.ModelAdmin):
    list_display = ("day_date", "start", "end", "duration_hours", "category", "status")
    list_filter = ("status", "category")
    date_hierarchy = "day_date"


@admin.register(IngestionIssue)
class IngestionIssueAdmin(admin.ModelAdmin):
    list_display = ("row_index", "issue_type", "action_taken", "created_at")
    list_filter = ("action_taken", "issue_type")


@admin.register(Dataset)
class DatasetAdmin(admin.ModelAdmin):
    list_display = (
        "filename", "source", "record_count", "issue_count", "is_active", "created_at"
    )
    list_filter = ("source", "is_active")
    readonly_fields = ("created_at",)
