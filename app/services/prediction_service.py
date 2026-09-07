from functools import lru_cache
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from app.schemas.prediction import PredictionRequest

MODEL_DIR = Path(__file__).resolve().parent.parent.parent / "models"
MODEL_PATH = MODEL_DIR / "best_energy_model.pkl"
PREPROCESSOR_PATH = MODEL_DIR / "preprocessor.pkl"

CATEGORICAL_COLS = ["city_tier", "income_level", "season"]

NUMERIC_COLS = [
    "population",
    "population_density",
    "city_area_km2",
    "urban_growth_rate",
    "temperature",
    "humidity",
    "rainfall",
    "residential_load_pct",
    "commercial_load_pct",
    "industrial_load_pct",
    "number_of_households",
    "number_of_commercial_establishments",
    "historical_consumption_kwh",
    "total_load_pct",
    "residential_commercial_diff",
    "temp_humidity_interaction",
    "population_growth_interaction",
    "rain_temperature_interaction",
    "temperature_squared",
    "humidity_squared",
]

HISTORICAL_CONSUMPTION_CONSTANT = 115319324


class PredictionService:
    def __init__(self):
        self.model = None
        self.preprocessor = None

        if MODEL_PATH.exists() and PREPROCESSOR_PATH.exists():
            self.model = joblib.load(MODEL_PATH)
            self.preprocessor = joblib.load(PREPROCESSOR_PATH)

    def predict(self, input_data: PredictionRequest) -> float:
        features_df = self._build_features(input_data)

        if self.model is None or self.preprocessor is None:
            return self._mock_predict(features_df)

        processed = self.preprocessor.transform(features_df)
        prediction_log = self.model.predict(processed)[0]

        # Model was trained on log1p(target); convert back to real kWh.
        return float(np.expm1(prediction_log))

    def _build_features(self, input_data: PredictionRequest) -> pd.DataFrame:
        row = input_data.model_dump()
        row["historical_consumption_kwh"] = HISTORICAL_CONSUMPTION_CONSTANT
        row["total_load_pct"] = (
            row["residential_load_pct"] + row["commercial_load_pct"]
        )
        row["residential_commercial_diff"] = (
            row["residential_load_pct"] - row["commercial_load_pct"]
        )
        row["temp_humidity_interaction"] = row["temperature"] * row["humidity"]
        row["population_growth_interaction"] = (
            row["population"] * row["urban_growth_rate"]
        )
        row["rain_temperature_interaction"] = row["rainfall"] * row["temperature"]
        row["temperature_squared"] = row["temperature"] ** 2
        row["humidity_squared"] = row["humidity"] ** 2

        ordered_cols = CATEGORICAL_COLS + NUMERIC_COLS
        return pd.DataFrame([row], columns=ordered_cols)

    def _mock_predict(self, features_df: pd.DataFrame) -> float:
        return 0.0


@lru_cache
def get_prediction_service() -> PredictionService:
    return PredictionService()
