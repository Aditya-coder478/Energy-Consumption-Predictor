# ⚡ Electricity Energy Prediction API

A FastAPI backend for an electricity energy consumption prediction platform. It provides JWT-based authentication and a `/predict` endpoint backed by a trained ML model (Random Forest / XGBoost / Linear Regression / Neural Network, whichever scored best — see [Model](#-model)).

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
│   │   └── prediction.py          # /predict (protected)
│   ├── schemas/
│   │   ├── auth.py                # Request/response models for auth
│   │   └── prediction.py          # Request/response models for prediction
│   ├── models/
│   │   └── user.py                # SQLAlchemy User table
│   ├── services/
│   │   ├── auth_service.py        # Registration/login business logic
│   │   └── prediction_service.py  # Model loading, feature engineering, inference
│   ├── database/
│   │   └── database.py            # Engine/session setup
│   └── core/
│       ├── config.py              # Reads settings from environment/.env
│       └── security.py            # Password hashing + JWT helpers
├── models/                        # Trained model artifacts (.pkl, gitignored)
├── .env.example
├── .gitignore
├── requirements.txt
└── README.md
```

Each layer has one job: **routers** handle HTTP concerns only, **schemas** define data shape, **services** hold the actual logic, and **models** define database tables. This keeps the ML model swappable without touching auth, routing, or the database.

## 🚀 Getting Started

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

### Add the trained model (optional)

Place the following files (produced by the training pipeline) into `backend/models/`:

```
backend/models/best_energy_model.pkl
backend/models/preprocessor.pkl
```

If these files are absent, `/predict` automatically falls back to a mock response so the rest of the API remains testable.

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
  "city_tier": 1,
  "income_level": 3,
  "season": "Summer",
  "population": 500000,
  "population_density": 8500,
  "city_area_km2": 58.8,
  "urban_growth_rate": 4.5,
  "temperature": 35.2,
  "humidity": 65,
  "rainfall": 12.5,
  "residential_load_pct": 60,
  "commercial_load_pct": 30,
  "industrial_load_pct": 10,
  "number_of_households": 150000,
  "number_of_commercial_establishments": 5000,
  "historical_consumption_kwh": 11000
}
```

Response:
```json
{ "prediction": 12345.67, "mock": false }
```

`mock: true` indicates the model files weren't found and a placeholder value was returned instead.

## 🔐 Authentication Flow

```
Register  →  Login (JWT issued)  →  Authorization: Bearer <token>  →  Protected routes
```

- Passwords are hashed with **bcrypt** before storage — never stored or logged in plain text.
- JWTs are signed with `SECRET_KEY` and expire after `ACCESS_TOKEN_EXPIRE_MINUTES`.
- The `get_current_user` dependency validates the token and loads the user on every protected request; invalid, missing, or expired tokens return `401 Unauthorized`.

## 🤖 Model

- **Target:** `energy_consumption_kwh` (log-transformed during training; predictions are converted back with `np.expm1`)
- **Preprocessing:** a separate `ColumnTransformer` (`preprocessor.pkl`) handles one-hot encoding for categorical fields (`city_tier`, `income_level`, `season`) and scaling for numeric fields — applied before inference, not baked into the model
- **Engineered features:** 7 derived columns (e.g. `total_load_pct`, `temp_humidity_interaction`, `temperature_squared`) computed server-side to match training
- **Swapping in a retrained model:** update `app/services/prediction_service.py` (feature list/engineering) and `app/schemas/prediction.py` (input contract) — no other files need to change

> **Note:** predictions can be unreliable for inputs far outside the ranges seen in training data. Validate input ranges against the training dataset before trusting extreme predictions.

## ⚠️ Error Responses

| Situation | Status |
|---|:---:|
| Invalid registration/request data | `422` |
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
