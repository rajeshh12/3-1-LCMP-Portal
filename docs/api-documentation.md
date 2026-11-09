# API notes

Base URL: `http://localhost:4000/api`. Protected calls require `Authorization: Bearer <JWT>`. JSON errors use `{ "error": "..." }`.

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/reset-password` | Public | Account and session flows |
| GET | `/auth/me` | Authenticated | Current user |
| GET | `/dashboard` | Authenticated | Role-scoped metrics and chart series |
| GET/POST | `/cases` | Read: scoped; create: admin/lawyer | Search/list/create cases |
| GET/PATCH/DELETE | `/cases/:id` | Scoped; delete: admin | Matter details and updates |
| GET/POST | `/tasks` | Read: scoped; create: admin/lawyer | Tasks and risk scores |
| PATCH/DELETE | `/tasks/:id` | Scoped; delete: admin/lawyer | Progress updates and removal |
| GET | `/calendar`, `/risk` | Authenticated, scoped | Event agenda and risk explanations |
| GET/PATCH | `/notifications`, `/notifications/:id/read`, `/notifications/read-all` | Recipient | Alert inbox |
| GET/POST | `/communications` | Case scoped | Client messages and internal notes |
| GET/POST | `/documents`, `/documents/:id/download` | Case scoped; upload: staff/lawyer/admin | Private document metadata and transfer |
| GET | `/clients`, `/team`, `/users`, `/audit` | Role-scoped | Directory and audit data |

The ML service exposes `GET /health` and `POST /predict`. Prediction inputs are validated by Pydantic; output includes probability, category, and selected model name.
