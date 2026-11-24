from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.database.database import Base, engine
from app.models import user  # noqa: F401 -- registers the model with Base
from app.routers import analytics, auth, prediction

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Electricity Energy Prediction API",
    description=(
        "Backend for the electricity energy prediction website. "
        "Provides JWT-based authentication and a prediction endpoint, and chart data for model analytics."
    ),
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.frontend_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(prediction.router)
app.include_router(analytics.router)


@app.get("/", tags=["health"])
def root():
    return {"status": "ok", "service": "electricity-prediction-api"}
