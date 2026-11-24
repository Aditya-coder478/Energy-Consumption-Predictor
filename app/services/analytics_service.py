"""Chart-ready data built from model_metadata.json and evaluation_data.csv."""
import json
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict

import numpy as np
import pandas as pd

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
METADATA_PATH = DATA_DIR / "model_metadata.json"
EVALUATION_PATH = DATA_DIR / "evaluation_data.csv"


class AnalyticsDataUnavailable(Exception):
    """Raised when the metadata/evaluation files are missing or unreadable."""


class AnalyticsService:
    def __init__(self) -> None:
        if not METADATA_PATH.exists() or not EVALUATION_PATH.exists():
            raise AnalyticsDataUnavailable(
                "Analytics data files not found. Expected "
                f"{METADATA_PATH.name} and {EVALUATION_PATH.name} in the data/ folder."
            )
        try:
            with METADATA_PATH.open(encoding="utf-8") as fh:
                self.metadata: Dict[str, Any] = json.load(fh)
            df = pd.read_csv(EVALUATION_PATH)
            df = df[["actual", "predicted"]].dropna()
        except Exception as exc:  # malformed JSON / missing columns
            raise AnalyticsDataUnavailable(f"Could not read analytics data: {exc}") from exc

        df = df.reset_index(drop=True)
        # Recompute the error from actual/predicted so it is always consistent.
        df["error"] = df["actual"] - df["predicted"]
        self.df = df
        self.best_model: str = self.metadata["best_model"]

    # ---- bar chart: model comparison -------------------------------------
    def model_comparison(self) -> dict:
        models = []
        for name, m in self.metadata["metrics"].items():
            models.append(
                {
                    "name": name,
                    "mae": m["MAE"],
                    "mse": m["MSE"],
                    "rmse": m["RMSE"],
                    "r2": m["R2"],
                    "mape": m["MAPE"],
                    "is_best": name == self.best_model,
                }
            )
        return {"best_model": self.best_model, "models": models}

    # ---- line / scatter chart: actual vs predicted ------------------------
    def actual_vs_predicted(self, limit: int) -> dict:
        total = len(self.df)
        if limit >= total:
            idx = np.arange(total)
        else:
            # Evenly spaced rows keep the sample representative and repeatable.
            idx = np.linspace(0, total - 1, limit).round().astype(int)
        sample = self.df.iloc[idx]
        points = [
            {
                "index": int(i),
                "actual": float(r.actual),
                "predicted": float(r.predicted),
                "error": float(r.error),
            }
            for i, r in zip(idx, sample.itertuples(index=False))
        ]
        return {
            "model": self.best_model,
            "total_rows": total,
            "returned_rows": len(points),
            "points": points,
        }

    # ---- histogram bar chart: error distribution --------------------------
    def error_distribution(self, bins: int) -> dict:
        err = self.df["error"].to_numpy()
        counts, edges = np.histogram(err, bins=bins)
        out = []
        for c, lo, hi in zip(counts, edges[:-1], edges[1:]):
            out.append(
                {
                    "label": f"{lo / 1e6:.1f}M to {hi / 1e6:.1f}M",
                    "lower": float(lo),
                    "upper": float(hi),
                    "count": int(c),
                }
            )
        return {
            "model": self.best_model,
            "bins": out,
            "mean_error": float(err.mean()),
            "median_error": float(np.median(err)),
            "std_error": float(err.std()),
            "mean_absolute_error": float(np.abs(err).mean()),
        }

    # ---- summary cards ----------------------------------------------------
    def summary(self) -> dict:
        best = self.metadata["metrics"][self.best_model]
        feats = self.metadata.get("features", {})
        return {
            "best_model": self.best_model,
            "target": self.metadata.get("target", ""),
            "total_rows": len(self.df),
            "mean_actual": float(self.df["actual"].mean()),
            "mean_predicted": float(self.df["predicted"].mean()),
            "mae": best["MAE"],
            "rmse": best["RMSE"],
            "r2": best["R2"],
            "mape": best["MAPE"],
            "categorical_features": feats.get("categorical", []),
            "numerical_features": feats.get("numerical", []),
        }


@lru_cache
def _load() -> AnalyticsService:
    return AnalyticsService()


def get_analytics_service() -> AnalyticsService:
    from fastapi import HTTPException, status

    try:
        return _load()
    except AnalyticsDataUnavailable as exc:
        # lru_cache does not cache exceptions, so a fixed setup is picked up on the next request.
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))
