from django.db import models


class Dataset(models.Model):
    """One imported version of the data.

    Each import (command or upload) creates a Dataset and attaches its records and
    issues to it, so previous imports remain viewable rather than being overwritten.
    The most recent import is marked active and is the default view.
    """

    class Source(models.TextChoices):
        COMMAND = "command"
        UPLOAD = "upload"

    filename = models.CharField(max_length=255, blank=True)
    source = models.CharField(
        max_length=20, choices=Source.choices, default=Source.COMMAND
    )
    record_count = models.IntegerField(default=0)
    issue_count = models.IntegerField(default=0)
    actions = models.JSONField(default=dict)  # {corrected: n, quarantined: n, flagged: n}
    is_active = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self) -> str:
        label = self.filename or "default file"
        return f"{label} @ {self.created_at:%Y-%m-%d %H:%M} ({self.record_count} records)"


class ActivityCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    group = models.CharField(max_length=100, blank=True)
    is_productive = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "activity categories"

    def __str__(self) -> str:
        return self.name


class ShiftRecord(models.Model):
    class Status(models.TextChoices):
        CLEAN = "clean"
        CORRECTED = "corrected"

    dataset = models.ForeignKey(
        Dataset, on_delete=models.CASCADE, related_name="records", null=True
    )
    day_date = models.DateField()
    start = models.DateTimeField()
    end = models.DateTimeField()
    duration_hours = models.FloatField()  # canonical, recomputed from start/end
    stated_hours = models.FloatField(null=True)  # original HOURS value, kept for audit
    category = models.ForeignKey(
        ActivityCategory, on_delete=models.PROTECT, related_name="shifts"
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.CLEAN
    )

    class Meta:
        ordering = ["day_date", "start"]

    def __str__(self) -> str:
        return f"{self.day_date} {self.category.name} ({self.duration_hours:.2f}h)"


class IngestionIssue(models.Model):
    dataset = models.ForeignKey(
        Dataset, on_delete=models.CASCADE, related_name="issues", null=True
    )
    row_index = models.IntegerField()
    raw_data = models.JSONField()
    issue_type = models.CharField(max_length=100)
    description = models.TextField()
    action_taken = models.CharField(max_length=20)  # corrected | quarantined | flagged
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["row_index", "id"]

    def __str__(self) -> str:
        return f"row {self.row_index}: {self.issue_type} -> {self.action_taken}"
