# Shift Analytics Dashboard

A full-stack application for visualising and analysing employee shift records. It
ingests a raw spreadsheet, cleans it through an auditable pipeline, and exposes the
clean dataset plus analytics through a REST API and an interactive React dashboard.

| Layer | Stack |
|-------|-------|
| **Backend** | Python · Django · Django REST Framework · SQLite |
| **Frontend** | React · Vite · TypeScript · Tailwind CSS · Recharts |
| **Tooling** | Docker / Docker Compose · pytest |

> **Design principle.** Everything that could reasonably change — tolerances,
> thresholds, the streak target category, the non-productive category set, the colour
> palette, and the data file path — is read from settings/env or the database, never
> hardcoded in logic.

---

## Table of contents

1. [Quick start (Docker)](#quick-start-docker)
2. [Running locally without Docker](#running-locally-without-docker)
3. [Tests](#tests)
4. [What it does](#what-it-does)
5. [Project structure](#project-structure)
6. [Timezone handling](#timezone-handling)
7. [Data-quality decisions](#data-quality-decisions)
8. [Analytics definitions](#analytics-definitions)
9. [Extensibility: the category model](#extensibility-the-category-model)
10. [Configuration reference](#configuration-reference)
11. [API reference](#api-reference)
12. [Uploading a new file](#uploading-a-new-file)
13. [Dataset versioning](#dataset-versioning)

---

## Quick start (Docker)

The whole stack runs in two containers. With [Docker Desktop](https://www.docker.com/products/docker-desktop/)
installed, from the project root run:

```bash
docker compose up --build
```

Then open:

- **Dashboard** → http://localhost:8080
- **API** (direct, for curl/testing) → http://localhost:8000/api

That's the entire setup. The backend container automatically applies migrations and
runs `import_shifts` on startup, so the dashboard comes up **fully seeded** from the
bundled spreadsheet with no manual steps. The frontend is built and served by nginx,
which also reverse-proxies `/api/` to the backend — so the two share a single origin
and there is no CORS to configure.

Stop the stack with `Ctrl-C`, or remove the containers with `docker compose down`.

> **A note on persistence.** The SQLite database lives inside the backend container
> and is rebuilt from the source spreadsheet on every start. This guarantees the app
> always boots with data. The trade-off is that files uploaded at runtime reset when
> the container restarts; the bundled dataset is always reloaded. (Local, non-Docker
> runs keep `backend/db.sqlite3` on disk and so persist uploads between restarts.)

### What the containers do

| Service | Image | Port | Responsibility |
|---------|-------|------|----------------|
| `backend` | `python:3.12-slim` + gunicorn | `8000` | Django REST API; migrates + seeds on startup |
| `frontend` | multi-stage `node:20` → `nginx:1.27` | `8080` | Serves the built SPA and proxies `/api/` to `backend` |

---

## Running locally without Docker

The app expects the backend on `http://127.0.0.1:8000` and the frontend dev server
on `http://127.0.0.1:5173`. Both run cleanly from a fresh checkout.

### Backend

```bash
cd backend
python -m venv venv
# Windows:        venv\Scripts\activate
# macOS / Linux:  source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py import_shifts
python manage.py runserver
```

`import_shifts` is idempotent — re-running it rebuilds the records and the issue log
from the source file while leaving the category catalogue intact.

Configuration is optional: copy `.env.example` to `.env` to override any default.
The bundled dataset already lives at `backend/data/shift_data.xlsx`, the default
`DATA_FILE_PATH`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Copy `.env.example` to `.env` to point `VITE_API_URL` somewhere other than the
default `http://127.0.0.1:8000/api`.

---

## Tests

```bash
cd backend
pytest
```

The suite covers each cleaning rule and the analytics (efficiency, streaks, reason
breakdown, insights) on small, focused fixtures.

---

## What it does

- **Ingests and cleans** a messy spreadsheet through an auditable pipeline that
  classifies every row (corrected / quarantined / flagged) and logs the decision.
- **Recomputes durations** canonically from `end - start`, retaining the original
  stated hours for audit.
- **Computes analytics** — operational efficiency (overall and per-day), breakdown
  streaks, a switchable reason/group breakdown, and dynamically generated insights.
- **Serves an interactive dashboard** — a KPI strip, a shift timeline, bar and pie
  charts, a filter bar that drives every view, a data-quality log, and dataset
  version switching.
- **Accepts runtime uploads** of new spreadsheets through the same validated pipeline,
  versioning each import so prior results stay viewable and a bad upload can't destroy
  good data.

---

## Project structure

```
.
├── docker-compose.yml          Orchestrates the backend + frontend containers
├── README.md
├── shift_data.xlsx             Source dataset (reference copy)
│
├── backend/                    Django project
│   ├── Dockerfile
│   ├── docker-entrypoint.sh    Migrates + seeds, then starts gunicorn
│   ├── .env.example
│   ├── manage.py
│   ├── pytest.ini
│   ├── requirements.txt
│   ├── data/
│   │   └── shift_data.xlsx      Default DATA_FILE_PATH
│   ├── config/                 Project settings, URLs, WSGI/ASGI
│   │   ├── settings.py
│   │   └── urls.py
│   └── shifts/                 Main app
│       ├── models.py           Dataset, ShiftRecord, ActivityCategory, IngestionIssue
│       ├── serializers.py
│       ├── views.py            API endpoints
│       ├── filters.py          Shared query-param filtering
│       ├── colors.py           Deterministic category → colour mapping
│       ├── pagination.py
│       ├── management/commands/
│       │   └── import_shifts.py   CLI ingestion command
│       ├── services/
│       │   ├── cleaning.py     The cleaning / ingestion pipeline
│       │   └── analytics.py    Efficiency, streaks, breakdown, insights
│       └── tests/              test_cleaning.py, test_analytics.py
│
└── frontend/                   Vite + React app
    ├── Dockerfile              Multi-stage build → nginx
    ├── nginx.conf              SPA serving + /api proxy
    ├── .env.example
    ├── index.html
    ├── package.json
    ├── vite.config.ts
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── types.ts
        ├── api/client.ts       Typed API client
        ├── hooks/useDashboard.ts
        └── components/         KPI strip, charts, filter bar, panels, upload
```

---

## Timezone handling

All source timestamps are UTC and are parsed, stored, and displayed as UTC end to
end — no silent conversion to the server or browser timezone. Django runs with
`TIME_ZONE = "UTC"` / `USE_TZ = True`, and the UI labels every time as UTC. A
`DISPLAY_TIMEZONE` setting exists as the single, explicit place to change this; it
defaults to `UTC`.

---

## Data-quality decisions

The dataset deliberately contains operational inconsistencies. During ingestion the
cleaning pipeline (`shifts/services/cleaning.py`) classifies every row and logs its
decision to the `IngestionIssue` table, which the API and the **Data Quality Log**
panel expose in full. The canonical `duration_hours` is always recomputed from
`end - start`; the original `HOURS` is retained as `stated_hours` for audit.

| Rule | Condition | Action | Status |
|------|-----------|--------|--------|
| 1 | Duration always recomputed from `end - start` | — | — |
| 2 | Stated `HOURS` differs from computed beyond `HOURS_TOLERANCE` (0.1h) | keep computed | **corrected** |
| 3 | Negative stated `HOURS` | keep computed | **corrected** |
| 4 | Missing `START` or `END` | cannot derive duration | **quarantined** |
| 5 | Unparseable timestamp (e.g. `invalid-time`) | cannot derive duration | **quarantined** |
| 6 | Invalid `DAY_DATE` (e.g. `2025-15-55`) but valid `START` | derive date from `START` | **corrected** |
| 6b | Invalid `DAY_DATE` and no valid `START` | — | **quarantined** |
| 7 | `END <= START` (impossible ordering) | — | **quarantined** |
| 8 | Computed span exceeds `MAX_SHIFT_HOURS` (16h) | implausible length | **quarantined** |
| 9 | Exact duplicate row | keep the first copy | **quarantined** (the duplicate) |
| 10 | Same-day time overlap | keep the record | **flagged** |

`REASON` is whitespace-trimmed on the way in as cheap insurance. The action
vocabulary is:

- **corrected** — the record enters analytics with a fixed value; the original is
  preserved in `stated_hours` and the change is logged.
- **quarantined** — the row never enters analytics but is always retained in the
  issue log (with its full raw data) and surfaced in the UI.
- **flagged** — an observation only; the record stays in the clean dataset.

On the bundled file this yields **46 analytical records**, with **4 corrected**,
**5 quarantined**, and **23 same-day-overlap flags**.

### The overlap assumption (rule 10)

The data has many same-day time overlaps and **no employee or machine identifier**
to disambiguate them. We therefore do **not** drop or merge overlaps: a record may
represent a different employee or resource, so overlaps are treated as valid. Each
overlap is logged as a `flagged` observation for transparency, and the records
remain in the analytical dataset. Consistent with the efficiency formula below,
**Total Hours sums all shift hours (overlaps included, not deduplicated).**

---

## Analytics definitions

All analytics operate only on the clean + corrected dataset and guard against empty
inputs and division by zero (a filter matching nothing returns zeros, not an error).

### Operational efficiency

```
efficiency = productive_hours / total_hours * 100
```

"Productive" is driven entirely by `ActivityCategory.is_productive`, so the score
adapts automatically when a category's classification changes. Reported both overall
and per day. Per the literal spec, only **Breakdown** and **Unknown Failure** are
seeded as non-productive (`NON_PRODUCTIVE_CATEGORIES`); this is fully configurable in
the database or via env.

### Breakdown streaks

A streak is a run of **consecutive calendar days** where each day has at least one
record of the target category (default **Breakdown**, via `STREAK_TARGET_CATEGORY`).
A day with no such record breaks the streak. Each streak reports its start date, end
date, length in days, and total hours of the target category across the streak. Only
streaks of at least `MIN_STREAK_DAYS` (default **2**) are surfaced; streaks are
ranked by total downtime.

### Reason breakdown

Total hours and record count per dimension value, where the dimension is switchable
between individual **reason** and **group**. This makes the "categories grouped
together" scenario usable: assign groups to categories and switch the toggle. When a
category has no group it falls back to its own name so it still appears individually.
The dashboard renders this both as a **Hours by Reason** bar chart and a **Reason
Distribution** pie (share of total hours), and surfaces headline figures —
efficiency, total hours, downtime, and the longest breakdown streak — in a KPI strip
at the top. Every one of these reacts to the active filters.

### Insights

At least three insights are computed dynamically (never hardcoded):

1. **Biggest downtime driver** — the non-productive reason consuming the most hours
   and its share of total downtime.
2. **Lowest-efficiency day** — the day with the lowest efficiency score and its
   non-productive hours.
3. **Most costly breakdown streak** — the streak with the greatest total downtime.

Each is returned as structured data with a short, action-oriented message.

---

## Extensibility: the category model

Categories live in the database (`ActivityCategory`), which keeps the system useful
as the data evolves:

- **New reasons never crash ingestion.** Any reason seen during import that doesn't
  exist yet is created automatically as productive.
- **Classifications are data, not code.** Flip `is_productive` on a category and the
  efficiency score and insights recompute accordingly — no deployment needed.
- **Grouping is data, too.** Set a `group` on related categories and the
  reason-breakdown can aggregate by group via the dimension toggle.
- **Colours are automatic.** Each category is mapped to a colour from the configured
  `CATEGORY_COLOR_PALETTE` by a stable hash, so every reason is coloured
  deterministically and new reasons need no code change.

---

## Configuration reference

All values live in `backend/.env` (see `.env.example`) with sensible defaults. When
running under Docker, the relevant values are set in `docker-compose.yml`.

| Variable | Default | Purpose |
|----------|---------|---------|
| `DATA_FILE_PATH` | `data/shift_data.xlsx` | Source spreadsheet (absolute or relative to `backend/`) |
| `DISPLAY_TIMEZONE` | `UTC` | Explicit display timezone |
| `HOURS_TOLERANCE` | `0.1` | Allowed stated-vs-computed gap before a record is corrected |
| `MAX_SHIFT_HOURS` | `16` | Spans beyond this are quarantined as implausible |
| `STREAK_TARGET_CATEGORY` | `Breakdown` | Category whose consecutive-day runs form streaks |
| `MIN_STREAK_DAYS` | `2` | Minimum streak length to surface |
| `NON_PRODUCTIVE_CATEGORIES` | `Breakdown,Unknown Failure` | Reasons seeded as non-productive |
| `MAX_RETAINED_DATASETS` | `10` | Imported versions to keep before pruning oldest |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Allowed frontend origins |
| `DEBUG` | `True` | Django debug mode (set `False` in the Docker image) |
| `SECRET_KEY` | dev placeholder | Django secret key (override in any real deployment) |
| `ALLOWED_HOSTS` | `localhost,127.0.0.1` | Hosts Django will serve |

The colour palette (`CATEGORY_COLOR_PALETTE`) lives in `config/settings.py`.

---

## API reference

| Endpoint | Description |
|----------|-------------|
| `GET /api/shifts/` | Clean + corrected records, filterable, paginated |
| `GET /api/shifts/chart/` | Records shaped for the shift timeline (date, start/end time, duration, reason, colour) |
| `GET /api/quality-issues/` | The ingestion issue log (corrected / quarantined / flagged) |
| `GET /api/datasets/` | All imported dataset versions, newest first (see *Dataset versioning*) |
| `GET /api/categories/` | Categories with group, `is_productive`, and colour |
| `GET /api/analytics/efficiency/` | Overall + per-day efficiency |
| `GET /api/analytics/streaks/` | Breakdown streaks |
| `GET /api/analytics/reason-breakdown/?dimension=reason\|group` | Hours and counts per dimension value |
| `GET /api/analytics/insights/` | Computed insights |
| `POST /api/import/` | Upload a spreadsheet to replace the dataset (see below) |

**Filters** (apply to `shifts`, `chart`, and every `analytics` endpoint):
`date_from`, `date_to`, `reason` (comma-separated), `group`, `productive`
(`true`/`false`), `min_duration`. The dashboard's filter bar drives all of them, so
every chart and table reflects the same filtered view.

**Dataset selection:** `shifts`, `chart`, `quality-issues`, and every `analytics`
endpoint also accept `?dataset=<id>` to read a specific imported version. Omit it to
read the active (latest) one.

---

## Uploading a new file

Beyond the `import_shifts` command, a spreadsheet can be uploaded at runtime from the
dashboard (the **Upload .xlsx** button in the header) or directly via the API. The
endpoint reuses the exact same cleaning pipeline as the management command.

```
POST /api/import/
Content-Type: multipart/form-data
field: file = <your .xlsx>
```

```bash
# Local
curl -X POST http://127.0.0.1:8000/api/import/ -F "file=@shift_data.xlsx"
# Docker (through the nginx proxy)
curl -X POST http://localhost:8080/api/import/ -F "file=@shift_data.xlsx"
```

A successful upload returns a summary of what was ingested, including the new
dataset version's id:

```json
{
  "dataset_id": 2,
  "filename": "shift_data.xlsx",
  "records": 46,
  "issues": 32,
  "actions": { "corrected": 4, "quarantined": 5, "flagged": 23 }
}
```

Notes:

- The pipeline **reads and validates before touching the database** and runs inside a
  transaction, so a malformed or non-spreadsheet upload returns `400` with a readable
  message and leaves existing data untouched.
- The file must use the same columns as the source sheet
  (`DAY_DATE, START, END, HOURS, REASON`). Only `.xlsx` / `.xlsm` are accepted.
- After a successful upload the dashboard switches to the new version and refreshes
  every chart, table, and the data-quality log automatically.

---

## Dataset versioning

Each import — whether from the `import_shifts` command or an upload — is stored as its
own **dataset version** (the `Dataset` model) with its records and issues attached to
it. Earlier imports are **not** overwritten; the newest import simply becomes the
*active* (default) version. This means:

- You can **view any previous import's full results** — every chart, table, and the
  data-quality log reload for that version. Use the **Datasets** panel on the dashboard
  (a **View** button per version), or pass `?dataset=<id>` to any read endpoint.
- A bad upload (e.g. a file with the wrong columns, yielding 0 records) **cannot
  destroy good data** — it becomes a new, empty version and you switch back to a prior
  one. The UI warns when an import produces 0 records.
- Versions beyond `MAX_RETAINED_DATASETS` (default 10) are pruned oldest-first, so
  history stays bounded.

Each version records the filename, source (`command` or `upload`), record and issue
counts, the corrected/quarantined/flagged breakdown, whether it's active, and a UTC
timestamp. The list is exposed at `GET /api/datasets/`.
