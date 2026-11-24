from typing import Literal

from pydantic import BaseModel, Field


class PredictionRequest(BaseModel):
    """Raw inputs for the energy model.

    The six derived features the model also needs (people_per_household,
    commercial_density, industrial_density, cooling_demand_index,
    temperature_squared, temperature_humidity_interaction) are computed on the
    server, so the client does not send them.
    """

    city_tier: Literal["Tier-1", "Tier-2", "Tier-3"]
    income_level: Literal["Low", "Medium", "High"]
    month: str = Field(
        ...,
        pattern=r"^\d{4}-(0[1-9]|1[0-2])$",
        description="Month as YYYY-MM, e.g. 2026-06 (model was trained on 2025-01 to 2026-12)",
        examples=["2026-06"],
    )
    season: Literal["Summer", "Monsoon", "Winter"]

    population: float = Field(..., gt=0)
    number_of_households: float = Field(..., gt=0)
    commercial_establishments: float = Field(..., ge=0)
    industrial_establishments: float = Field(..., ge=0)
    temperature_c: float = Field(..., ge=-50, le=60, description="Temperature in °C")
    humidity_pct: float = Field(..., ge=0, le=100)
    ac_penetration_pct: float = Field(..., ge=0, le=100)


class PredictionResponse(BaseModel):
    prediction: float = Field(..., description="Predicted energy consumption in kWh")
