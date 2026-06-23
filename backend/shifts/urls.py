from django.urls import path

from shifts import views

urlpatterns = [
    path("shifts/", views.ShiftListView.as_view(), name="shift-list"),
    path("shifts/chart/", views.ShiftChartView.as_view(), name="shift-chart"),
    path("quality-issues/", views.QualityIssueListView.as_view(), name="quality-issues"),
    path("datasets/", views.DatasetListView.as_view(), name="datasets"),
    path("categories/", views.CategoryListView.as_view(), name="category-list"),
    path("analytics/efficiency/", views.EfficiencyView.as_view(), name="efficiency"),
    path("analytics/streaks/", views.StreaksView.as_view(), name="streaks"),
    path("analytics/reason-breakdown/", views.ReasonBreakdownView.as_view(),
         name="reason-breakdown"),
    path("analytics/insights/", views.InsightsView.as_view(), name="insights"),
    path("import/", views.ShiftImportView.as_view(), name="shift-import"),
]
