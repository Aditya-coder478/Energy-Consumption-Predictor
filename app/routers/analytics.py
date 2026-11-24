from fastapi import APIRouter, Depends, Query

from app.models.user import User
from app.routers.auth import get_current_user
from app.schemas.analytics import (
    ActualVsPredictedResponse,
    AnalyticsSummaryResponse,
    ErrorDistributionResponse,
    ModelComparisonResponse,
)
from app.services.analytics_service import AnalyticsService, get_analytics_service

# To make these endpoints public (e.g. while the login page is unfinished),
# remove the `dependencies=[...]` argument below.
router = APIRouter(
    prefix="/analytics",
    tags=["analytics"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/summary", response_model=AnalyticsSummaryResponse)
def summary(service: AnalyticsService = Depends(get_analytics_service)):
    return service.summary()


@router.get("/model-comparison", response_model=ModelComparisonResponse)
def model_comparison(service: AnalyticsService = Depends(get_analytics_service)):
    return service.model_comparison()


@router.get("/actual-vs-predicted", response_model=ActualVsPredictedResponse)
def actual_vs_predicted(
    limit: int = Query(300, ge=10, le=5000, description="Max number of points returned"),
    service: AnalyticsService = Depends(get_analytics_service),
):
    return service.actual_vs_predicted(limit)


@router.get("/error-distribution", response_model=ErrorDistributionResponse)
def error_distribution(
    bins: int = Query(20, ge=5, le=100, description="Number of histogram bins"),
    service: AnalyticsService = Depends(get_analytics_service),
):
    return service.error_distribution(bins)
