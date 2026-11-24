from fastapi import APIRouter, Depends, HTTPException, status

from app.models.user import User
from app.routers.auth import get_current_user
from app.schemas.prediction import PredictionRequest, PredictionResponse
from app.services.prediction_service import (
    InvalidInputError,
    PredictionService,
    get_prediction_service,
)

router = APIRouter(tags=["prediction"])


@router.post("/predict", response_model=PredictionResponse)
def predict(
    request: PredictionRequest,
    current_user: User = Depends(get_current_user),
    prediction_service: PredictionService = Depends(get_prediction_service),
):
    try:
        result = prediction_service.predict(request)
    except InvalidInputError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))
    return PredictionResponse(prediction=result)
