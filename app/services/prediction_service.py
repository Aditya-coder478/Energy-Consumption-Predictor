import logging
from functools import lru_cache
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from app.schemas.prediction import PredictionRequest

logger = logging.getLogger(__name__)

MODEL_DIR = Path(__file__).resolve().parent.parent.parent / "models"
MODEL_PATH = MODEL_DIR / "best_energy_model.pkl"
PREPROCESSOR_PATH = MODEL_DIR / "preprocessor.pkl"


class ModelUnavailableError(Exception):
    """The model or preprocessor is missing, unreadable, or does not match."""


class InvalidInputError(ValueError):
    """The request contains a value the model was not trained on."""


class PredictionService:
    def __init__(self) -> None:
        if not MODEL_PATH.exists() or not PREPROCESSOR_PATH.exists():
            raise ModelUnavailableError(
                "Model files not found. Expected best_energy_model.pkl and "
                "preprocessor.pkl in the models/ folder."
            )
        try:
            self.model = joblib.load(MODEL_PATH)
            self.preprocessor = joblib.load(PREPROCESSOR_PATH)
        except Exception as exc:
            raise ModelUnavailableError(f"Could not load model files: {exc}") from exc

        expected = getattr(self.model, "n_features_in_", None)
        produced = len(self.preprocessor.get_feature_names_out())
        if expected is not None and expected != produced:
            raise ModelUnavailableError(
                f"preprocessor.pkl produces {produced} features but the model expects "
                f"{expected}. Use the preprocessor saved with this model."
            )

        # Column order and allowed category values come from the fitted preprocessor itself.
        self.input_columns = list(self.preprocessor.feature_names_in_)
        cat_cols = list(self.preprocessor.transformers_[0][2])
        encoder = self.preprocessor.named_transformers_["cat"].named_steps["encoder"]
        self.allowed_categories = {
            col: [str(v) for v in cats] for col, cats in zip(cat_cols, encoder.categories_)
        }

    def predict(self, input_data: PredictionRequest) -> float:
        self._validate_categories(input_data)
        features_df = self._build_features(input_data)

        processed = self.preprocessor.transform(features_df)
        prediction_log = self.model.predict(processed)[0]

        # Model was trained on log1p(target); convert back to real kWh.
        return float(np.expm1(prediction_log))

    def _validate_categories(self, input_data: PredictionRequest) -> None:
        # The encoder would silently ignore unseen values, so reject them instead.
        for col, allowed in self.allowed_categories.items():
            value = str(getattr(input_data, col))
            if value not in allowed:
                shown = ", ".join(allowed) if len(allowed) <= 6 else f"{allowed[0]} to {allowed[-1]}"
                raise InvalidInputError(
                    f"'{value}' is not a value the model was trained on for {col}. Allowed: {shown}."
                )

    def _build_features(self, input_data: PredictionRequest) -> pd.DataFrame:
        row = input_data.model_dump()

        # Derived features. Formulas were matched against the training mean/std stored in
        # preprocessor.pkl (see README, "Derived features").
        row["people_per_household"] = row["population"] / row["number_of_households"]
        row["commercial_density"] = row["commercial_establishments"] / row["population"] * 1000
        row["industrial_density"] = row["industrial_establishments"] / row["population"] * 1000
        row["cooling_demand_index"] = row["temperature_c"] * row["ac_penetration_pct"]
        row["temperature_squared"] = row["temperature_c"] ** 2
        row["temperature_humidity_interaction"] = row["temperature_c"] * row["humidity_pct"]

        return pd.DataFrame([row], columns=self.input_columns)


@lru_cache
def _load() -> PredictionService:
    return PredictionService()


def get_prediction_service() -> PredictionService:
    from fastapi import HTTPException, status

    try:
        return _load()
    except ModelUnavailableError as exc:
        # lru_cache does not cache exceptions, so a fixed setup is picked up on the next request.
        logger.error("Prediction model unavailable: %s", exc)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))
