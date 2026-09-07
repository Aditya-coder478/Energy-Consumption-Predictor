from typing import Literal

from pydantic import BaseModel, Field


class PredictionRequest(BaseModel):
    city_tier: int = Field(..., ge=1, le=5, description="City tier, e.g. 1 (metro) - 5")
    income_level: int = Field(..., ge=1, le=5, description="Income level bracket")
    season: Literal["Summer", "Winter", "Monsoon", "Spring", "Autumn"]

    population: float = Field(..., gt=0)
    population_density: float = Field(..., gt=0)
    city_area_km2: float = Field(..., gt=0)
    urban_growth_rate: float
    temperature: float
    humidity: float = Field(..., ge=0, le=100)
    rainfall: float = Field(..., ge=0)
    residential_load_pct: float = Field(..., ge=0, le=100)
    commercial_load_pct: float = Field(..., ge=0, le=100)
    industrial_load_pct: float = Field(..., ge=0, le=100)
    number_of_households: float = Field(..., ge=0)
    number_of_commercial_establishments: float = Field(..., ge=0)


class PredictionResponse(BaseModel):
    prediction: float
    mock: bool = False
