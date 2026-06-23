from rest_framework import generics, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from shifts.filters import ShiftRecordFilter
from shifts.models import (
    ActivityCategory,
    Dataset,
    IngestionIssue,
    ShiftRecord,
)
from shifts.serializers import (
    ActivityCategorySerializer,
    DatasetSerializer,
    IngestionIssueSerializer,
    ShiftChartSerializer,
    ShiftRecordSerializer,
)
from shifts.services import analytics, cleaning

# All persisted ShiftRecords are clean or corrected (quarantined rows never
# become records), so this is the analytical dataset the brief asks for.
ANALYTICAL_RECORDS = ShiftRecord.objects.select_related("category")


def _resolve_dataset(request: Request) -> Dataset | None:
    """The dataset a request targets: an explicit ?dataset=<id>, else the active one."""
    dataset_id = request.GET.get("dataset")
    if dataset_id:
        return Dataset.objects.filter(pk=dataset_id).first()
    return Dataset.objects.filter(is_active=True).first()


def _scoped_records(request: Request):
    dataset = _resolve_dataset(request)
    base = ANALYTICAL_RECORDS.filter(dataset=dataset) if dataset else ShiftRecord.objects.none()
    return dataset, base


def _filtered_records(request: Request):
    _, base = _scoped_records(request)
    return ShiftRecordFilter(request.GET, queryset=base).qs


class ShiftListView(generics.ListAPIView):
    serializer_class = ShiftRecordSerializer
    filterset_class = ShiftRecordFilter

    def get_queryset(self):
        _, base = _scoped_records(self.request)
        return base


class ShiftChartView(APIView):
    def get(self, request: Request) -> Response:
        records = _filtered_records(request)
        return Response(ShiftChartSerializer(records, many=True).data)


class CategoryListView(generics.ListAPIView):
    serializer_class = ActivityCategorySerializer
    queryset = ActivityCategory.objects.all()


class QualityIssueListView(generics.ListAPIView):
    serializer_class = IngestionIssueSerializer
    filterset_fields = ["action_taken", "issue_type"]

    def get_queryset(self):
        dataset = _resolve_dataset(self.request)
        return IngestionIssue.objects.filter(dataset=dataset) if dataset else IngestionIssue.objects.none()


class DatasetListView(generics.ListAPIView):
    serializer_class = DatasetSerializer
    queryset = Dataset.objects.all()


class EfficiencyView(APIView):
    def get(self, request: Request) -> Response:
        return Response(analytics.compute_efficiency(_filtered_records(request)))


class StreaksView(APIView):
    def get(self, request: Request) -> Response:
        return Response(analytics.compute_streaks(_filtered_records(request)))


class ReasonBreakdownView(APIView):
    def get(self, request: Request) -> Response:
        dimension = request.GET.get("dimension", "reason")
        if dimension not in ("reason", "group"):
            dimension = "reason"
        data = analytics.compute_reason_breakdown(_filtered_records(request), dimension)
        return Response({"dimension": dimension, "results": data})


class InsightsView(APIView):
    def get(self, request: Request) -> Response:
        return Response(analytics.compute_insights(_filtered_records(request)))


class ShiftImportView(APIView):
    """Upload a spreadsheet to replace the current dataset.

    Reuses the same cleaning pipeline as the management command. The pipeline
    reads and validates before touching the DB and runs in a transaction, so a
    bad upload leaves the existing data untouched.
    """

    parser_classes = [MultiPartParser, FormParser]

    def post(self, request: Request) -> Response:
        upload = request.FILES.get("file")
        if upload is None:
            return Response(
                {"detail": "No file provided. Send the spreadsheet as 'file'."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not upload.name.lower().endswith((".xlsx", ".xlsm")):
            return Response(
                {"detail": "Unsupported file type. Upload an .xlsx spreadsheet."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            outcome = cleaning.import_from_file(upload, source="upload")
        except Exception as exc:  # surfaced to the user; the source file is theirs
            return Response(
                {"detail": f"Could not process the file: {exc}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        result = outcome.result
        actions: dict[str, int] = {}
        for issue in result.issues:
            actions[issue.action_taken] = actions.get(issue.action_taken, 0) + 1

        return Response(
            {
                "dataset_id": outcome.dataset_id,
                "filename": upload.name,
                "records": len(result.records),
                "issues": len(result.issues),
                "actions": actions,
            }
        )
