# Briefcase — Legal Case Management Portal

A synthetic-data legal operations demo with a React/Vite client, Express/Mongoose API, MongoDB persistence and an optional FastAPI/scikit-learn deadline risk service. The software is a workflow demonstration, not legal advice or a validated predictor of real-world legal outcomes.

## What is included

- JWT sign-in, bcrypt password hashes, client self-registration, role checks and password reset flow.
- Matter CRUD APIs, task assignment and progress updates, hearing/deadline calendar agenda, client communication history, private case document uploads/downloads and audit records.
- Database-backed overview and analytics, in-app alerts, deduplicated deadline reminders, and SMTP notifications when configured.
- A reproducible synthetic seed (100 matters, 300 tasks, 120 notifications, 120 communications) and four role demo accounts.
- A synthetic deadline dataset generator, held-out comparison of four classifiers, serialized preprocessing/model pipeline, and FastAPI prediction endpoint.
- If the ML service is unavailable, the API reports a deterministic rules-based risk estimate rather than fabricating a trained-model result.

## Requirements

- Node.js 20.19+ (Node 22 recommended) and npm.
- Docker Desktop for the MongoDB container, or a separately managed MongoDB instance.
- Python 3.11+ only if you want to generate/train/use the ML service.

## Start locally (Windows PowerShell)

From the project directory:

```powershell
npm install
npm install --prefix backend
npm install --prefix frontend
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env
docker compose up -d mongo
```

Set a private `JWT_SECRET` in `backend\.env`, then seed the demo database and start the web app/API:

```powershell
npm run seed
npm run dev
```

Open `http://localhost:5173`. The API health check is `http://localhost:4000/api/health`.
The seed command **clears all collections** in the configured MongoDB database before loading the synthetic demo workspace. Use only a disposable database.

### Demo accounts

All seeded users use `DemoPass!234`:

| Role | Email |
|---|---|
| Admin | `admin@briefcase.test` |
| Lawyer | `lawyer@briefcase.test` |
| Staff | `staff@briefcase.test` |
| Client | `client@briefcase.test` |

The seed also creates synthetic lawyer accounts `counsel01@briefcase.test`–`counsel10@briefcase.test` and client accounts `client01@briefcase.test`–`client29@briefcase.test`.

### Train and start the ML service (optional)

```powershell
Set-Location ml-service
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python scripts\generate_dataset.py
python scripts\train_model.py
python run.py
```

Set `ML_SERVICE_URL=http://localhost:8000` in `backend\.env` (the example already includes it), then restart the API. Training prints the held-out metrics and refreshes `models\evaluation.json` and `deadline-risk.joblib`. The reproducible synthetic CSV and trained demonstration model are included. If Python or compatible wheels are unavailable, the main portal still works using its clearly labelled local rules fallback.

### Tests and production setup

```powershell
npm test
npm run build
.\ml-service\.venv\Scripts\python.exe -m unittest discover -s ml-service\tests -v
```

Configure SMTP only on the backend (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`). Without SMTP, in-app notifications continue to work; password reset links are logged only in non-production mode. Production password reset delivery requires SMTP. Set `CLIENT_ORIGIN` to the exact deployed frontend origin and use HTTPS, a strong secret, secure infrastructure, and a private MongoDB. Google Calendar OAuth is not connected; the internal calendar works without external credentials.

## Current demonstration scope

The calendar supports month, week and day views in Asia/Kolkata time. Analytics are calculated from current persisted records and include status/type, task completion, risk and open workload; custom date-range filters and a historical monthly trend are not included. The UI provides case create/edit/delete and task create/status/delete workflows; task details and full task editing are available through the API. Documents are private to authorized matter participants and limited to PDF/DOC/DOCX/JPG/PNG up to 10 MB. Synthetic training/evaluation is for demonstrating a pipeline only; do not use its probabilities to make legal or operational decisions.

Latest local synthetic holdout results are documented in [ML evaluation](docs/ml-evaluation.md). See [architecture](docs/architecture.md), [workflow](docs/workflow.md), [database schema](docs/database-schema.md), and [API notes](docs/api-documentation.md).
