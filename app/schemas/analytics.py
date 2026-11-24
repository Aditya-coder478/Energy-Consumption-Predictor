from typing import List

from pydantic import BaseModel


class ModelMetrics(BaseModel):
    name: str
    mae: float
    mse: float
    rmse: float
    r2: float
    mape: float
    is_best: bool


class ModelComparisonResponse(BaseModel):
    best_model: str
    models: List[ModelMetrics]


class ActualVsPredictedPoint(BaseModel):
    index: int
    actual: float
    predicted: float
    error: float  # actual - predicted


class ActualVsPredictedResponse(BaseModel):
    model: str
    total_rows: int
    returned_rows: int
    points: List[ActualVsPredictedPoint]


class ErrorBin(BaseModel):
    label: str
    lower: float
    upper: float
    count: int


class ErrorDistributionResponse(BaseModel):
    model: str
    bins: List[ErrorBin]
    mean_error: float
    median_error: float
    std_error: float
    mean_absolute_error: float


class AnalyticsSummaryResponse(BaseModel):
    best_model: str
    target: str
    total_rows: int
    mean_actual: float
    mean_predicted: float
    mae: float
    rmse: float
    r2: float
    mape: float
    categorical_features: List[str]
    numerical_features: List[str]
