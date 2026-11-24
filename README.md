# ⚡ Electricity Energy Prediction API

A FastAPI backend for an electricity energy consumption prediction platform. It provides JWT-based authentication, a `/predict` endpoint backed by a trained XGBoost model (see [Model](#-model)), and `/analytics/*` endpoints that serve chart data.

![Python](https://img.shields.io/badge/python-3.10+-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-009688.svg)
![License](https://img.shields.io/badge/license-MIT-lightgrey.svg)

```
React Frontend  →  FastAPI Backend  →  ML Model  →  FastAPI Backend  →  React Frontend
```

---

## Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [API Reference](#-api-reference)
- [Authentication Flow](#-authentication-flow)
- [Model](#-model)
- [Error Responses](#-error-responses)
- [Switching to PostgreSQL](#-switching-to-postgresql)
- [Roadmap](#-roadmap)

---

## ✨ Features

- User registration with bcrypt password hashing (passwords are never stored in plain text)
- JWT-based login and session authentication
- Protected `/predict` endpoint requiring a valid access token
- Clean separation of routing, schemas, business logic, and database layers
- ML model and preprocessing isolated behind a single service, swappable without touching routes, auth, or the database
- CORS restricted to a configurable frontend origin
- Auto-generated interactive API docs (Swagger UI)

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Web framework | [FastAPI](https://fastapi.tiangolo.com/) |
| Server | [Uvicorn](https://www.uvicorn.org/) |
| Database ORM | [SQLAlchemy](https://www.sqlalchemy.org/) |
| Database (dev) | SQLite (swappable to PostgreSQL) |
| Auth | JWT via [python-jose](https://github.com/mpdavis/python-jose), password hashing via [bcrypt](https://pypi.org/project/bcrypt/) |
| Validation | [Pydantic v2](https://docs.pydantic.dev/) |
| ML | scikit-learn, XGBoost, joblib, pandas, numpy |

## 📁 Project Structure

```
backend/
├── app/
│   ├── main.py                    # App creation, CORS, router registration
│   ├── routers/
│   │   ├── auth.py                # /auth/register, /auth/login, /auth/me
│   │   ├── prediction.py          # /predict (protected)
│   │   └── analytics.py           # /analytics/* chart data (protected)
│   ├── schemas/
│   │   ├── auth.py                # Request/response models for auth
│   │   ├── prediction.py          # Request/response models for prediction
│   │   └── analytics.py           # Response models for chart data
│   ├── models/
│   │   └── user.py                # SQLAlchemy User table
│   ├── services/
│   │   ├── auth_service.py        # Registration/login business logic
│   │   ├── prediction_service.py  # Model loading, feature engineering, inference
│   │   └── analytics_service.py   # Builds chart data from data/ files
│   ├── database/
│   │   └── database.py            # Engine/session setup
│   └── core/
│       ├── config.py              # Reads settings from environment/.env
│       └── security.py            # Password hashing + JWT helpers
├── data/                          # model_metadata.json + evaluation_data.csv (analytics)
├── models/                        # best_energy_model.pkl + preprocessor.pkl
├── .env.example
├── .gitignore
├── requirements.txt
└── README.md
```

Each layer has one job: **routers** handle HTTP concerns only, **schemas** define data shape, **services** hold the actual logic, and **models** define database tables. This keeps the ML model swappable without touching auth, routing, or the database.

## 🚀 Getting Started

### Quick start (everything is already set up)

1. Install Python 3.10+ (3.12 recommended).
2. Double-click **`run.bat`** (Windows) or run **`./run.sh`** (macOS/Linux). The first run creates a virtual environment and installs the requirements, which takes a few minutes. Later runs start immediately.
3. Open `http://127.0.0.1:8000/docs` for the interactive API docs.
4. With the server running, open a second terminal in this folder and run `python smoke_test.py` to check registration, login, `/predict` and all four `/analytics/*` endpoints.

`.env` is already included with a generated `SECRET_KEY`. The sections below are the manual setup, if you prefer it.

### Prerequisites
- Python 3.10+
- pip

### Installation

```bash
git clone <your-repo-url>
cd backend

python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

pip install -r requirements.txt
```

### Configuration

```bash
cp .env.example .env
```

Generate a secret key and set it in `.env`:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

### Trained model files

Place the following files (produced by the training pipeline) into `backend/models/`:

```
backend/models/best_energy_model.pkl
backend/models/preprocessor.pkl
```

Both files are required and must come from the same training run. If either is missing or they do not match, `/predict` returns `503 Service Unavailable` with an explanation (there is no mock fallback). Everything else in the API keeps working.

### Run

```bash
uvicorn app.main:app --reload
```

The API is available at `http://127.0.0.1:8000`, with interactive docs at `http://127.0.0.1:8000/docs`.

## 🔧 Environment Variables

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | Database connection string | `sqlite:///./app.db` |
| `SECRET_KEY` | Secret used to sign JWTs — **required**, keep private | *(none — must be set)* |
| `ALGORITHM` | JWT signing algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | JWT validity duration | `60` |
| `FRONTEND_URL` | Allowed CORS origin for the frontend | `http://localhost:5173` |

## 📚 API Reference

All endpoints are documented interactively at `/docs`. Summary:

| Method | Endpoint | Auth required | Description |
|---|---|:---:|---|
| `POST` | `/auth/register` | No | Create a new user account |
| `POST` | `/auth/login` | No | Authenticate and receive a JWT |
| `GET` | `/auth/me` | Yes | Get the current authenticated user's profile |
| `POST` | `/predict` | Yes | Get an electricity consumption prediction |
| `GET` | `/analytics/summary` | Yes | Headline numbers for the best model |
| `GET` | `/analytics/model-comparison` | Yes | MAE / RMSE / R² / MAPE per model (bar chart) |
| `GET` | `/analytics/actual-vs-predicted` | Yes | Actual vs predicted points (line / scatter chart) |
| `GET` | `/analytics/error-distribution` | Yes | Histogram of prediction errors (bar chart) |
| `GET` | `/` | No | Health check |

### `POST /auth/register`

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "a-secure-password"
}
```

### `POST /auth/login`

Form-encoded (`application/x-www-form-urlencoded`), using standard OAuth2 field names:

```
username=jane@example.com
password=a-secure-password
```

Response:
```json
{ "access_token": "<jwt>", "token_type": "bearer" }
```

### `POST /predict`

Requires header: `Authorization: Bearer <access_token>`

```json
{
  "city_tier": "Tier-1",
  "income_level": "Medium",
  "month": "2026-06",
  "season": "Summer",
  "population": 1330000,
  "number_of_households": 335000,
  "commercial_establishments": 8350,
  "industrial_establishments": 106,
  "temperature_c": 27.9,
  "humidity_pct": 60.5,
  "ac_penetration_pct": 19.5
}
```

| Field | Allowed values |
|---|---|
| `city_tier` | `Tier-1`, `Tier-2`, `Tier-3` |
| `income_level` | `Low`, `Medium`, `High` |
| `month` | `YYYY-MM`, from `2025-01` to `2026-12` (the months the model was trained on) |
| `season` | `Summer`, `Monsoon`, `Winter` |
| `population`, `number_of_households` | greater than 0 |
| `commercial_establishments`, `industrial_establishments` | 0 or more |
| `temperature_c` | -50 to 60 |
| `humidity_pct`, `ac_penetration_pct` | 0 to 100 |

Response (predicted consumption in kWh):
```json
{ "prediction": 95615448.0 }
```

Values the model was not trained on (for example `month: "2027-03"`) return `422` with a message listing the allowed values.

### Analytics (chart data)

All four endpoints are `GET`, need `Authorization: Bearer <access_token>`, and return JSON ready for a charting library. They read `data/model_metadata.json` and `data/evaluation_data.csv`; if those files are missing they return `503`.

| Endpoint | Query params | Response (shape) |
|---|---|---|
| `/analytics/summary` | none | `best_model`, `target`, `total_rows`, `mean_actual`, `mean_predicted`, `mae`, `rmse`, `r2`, `mape`, `categorical_features`, `numerical_features` |
| `/analytics/model-comparison` | none | `best_model`, `models[]` with `name`, `mae`, `mse`, `rmse`, `r2`, `mape`, `is_best` |
| `/analytics/actual-vs-predicted` | `limit` (10-5000, default 300) | `total_rows`, `returned_rows`, `points[]` with `index`, `actual`, `predicted`, `error` (actual − predicted) |
| `/analytics/error-distribution` | `bins` (5-100, default 20) | `bins[]` with `label`, `lower`, `upper`, `count`, plus `mean_error`, `median_error`, `std_error`, `mean_absolute_error` |

Values are in kWh (MAPE is a percentage). `limit` picks evenly spaced rows, so the same call always returns the same points.

## 🔐 Authentication Flow

```
Register  →  Login (JWT issued)  →  Authorization: Bearer <token>  →  Protected routes
```

- Passwords are hashed with **bcrypt** before storage — never stored or logged in plain text.
- JWTs are signed with `SECRET_KEY` and expire after `ACCESS_TOKEN_EXPIRE_MINUTES`.
- The `get_current_user` dependency validates the token and loads the user on every protected request; invalid, missing, or expired tokens return `401 Unauthorized`.

## 🤖 Model

- **Model:** XGBoost regressor (`models/best_energy_model.pkl`), 42 encoded input features
- **Target:** `energy_consumption_kwh` (log-transformed during training; predictions are converted back with `np.expm1`)
- **Preprocessing:** `models/preprocessor.pkl` is a `ColumnTransformer` (one-hot encoding for `city_tier`, `income_level`, `month`, `season`; median-impute + standard scaling for the 13 numeric features). It is applied before inference and is not baked into the model. Its column list and allowed category values are read from the file itself.
- **Library versions:** the pickles were saved with scikit-learn 1.9.0, which `requirements.txt` pins. Reinstall with `pip install -r requirements.txt` if loading fails.
- **Swapping in a retrained model:** replace both `.pkl` files together, then update `app/schemas/prediction.py` (inputs) and the derived features in `app/services/prediction_service.py` if the feature set changed.

### Derived features

The client sends 7 numeric inputs; the other 6 numeric features are computed in `prediction_service.py`:

| Feature | Formula |
|---|---|
| `people_per_household` | `population / number_of_households` |
| `commercial_density` | `commercial_establishments / population * 1000` |
| `industrial_density` | `industrial_establishments / population * 1000` |
| `cooling_demand_index` | `temperature_c * ac_penetration_pct` |
| `temperature_squared` | `temperature_c ** 2` |
| `temperature_humidity_interaction` | `temperature_c * humidity_pct` |

These formulas were reconstructed by checking each candidate against the training mean and standard deviation stored in `preprocessor.pkl`, not copied from the training notebook. **Confirm them against the notebook** (especially `commercial_density`, `industrial_density` and `cooling_demand_index`).

> **Note:** predictions can be unreliable for inputs far outside the ranges seen in training data.

## ⚠️ Error Responses

| Situation | Status |
|---|:---:|
| Invalid registration/request data | `422` |
| `/predict` value the model was not trained on | `422` |
| Model or analytics data files missing or mismatched | `503` |
| Email already registered | `409` |
| Wrong email/password on login | `401` |
| Missing, invalid, or expired JWT | `401` |
| Unexpected server error | `500` |

Passwords, password hashes, and JWT secrets are never included in any API response.

## 🐘 Switching to PostgreSQL

1. Install a driver: `pip install psycopg2-binary`
2. Update `DATABASE_URL` in `.env`:
   ```
   DATABASE_URL=postgresql://user:password@localhost:5432/energy_db
   ```
No other code changes are required — `app/database/database.py` reads the connection string from settings.

## 🗺 Roadmap

- [ ] Alembic migrations for schema versioning
- [ ] Input range validation against training data bounds
- [ ] Refresh tokens
- [ ] Rate limiting on `/auth/login`
- [ ] CI pipeline (lint + tests)

---

## License

MIT — feel free to use and adapt.
