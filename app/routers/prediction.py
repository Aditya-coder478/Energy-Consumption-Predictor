from fastapi import APIRouter, Depends

from app.models.user import User
from app.routers.auth import get_current_user
from app.schemas.prediction import PredictionRequest, PredictionResponse
from app.services.prediction_service import PredictionService, get_prediction_service

router = APIRouter(tags=["prediction"])


@router.post("/predict", response_model=PredictionResponse)
def predict(
    request: PredictionRequest,
    current_user: User = Depends(get_current_user),
    prediction_service: PredictionService = Depends(get_prediction_service),
):
    result = prediction_service.predict(request)
    return PredictionResponse(prediction=result, mock=prediction_service.model is None)
