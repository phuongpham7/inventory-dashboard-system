# Intelligent Inventory Dashboard

Next.js (React) frontend and Node.js (Express) backend with MongoDB, implementing the system design document.

## Run it

Requires Node.js 20+ and Docker (for MongoDB).

```bash
# 1. Database
docker compose up -d mongo

# 2. Backend (http://localhost:4000)
cd backend
cp .env.example .env
npm install
npm run seed      # loads 240 demo vehicles
npm run dev

# 3. Frontend (http://localhost:3000), in a second terminal
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Open http://localhost:3000.

## What it does

- **Filterable inventory:** search (VIN, make, model), make, model, age bucket and sort. Filtering, sorting and paging run in MongoDB, 12 rows per request.
- **Aging stock:** vehicles in stock for more than 90 days (`AGING_DAYS` in `backend/.env`) are flagged in a pinned panel and in the table.
- **Actionable insights:** log a status or planned action on any aging vehicle. Actions are stored in an append-only `vehicle_actions` collection; the newest one is the vehicle's current action and the rest are history.

## API

| Endpoint | Purpose |
|---|---|
| `GET /api/vehicles?make=&model=&q=&bucket=&sort=&page=&size=` | Filtered, paginated list with `age_days`, `is_aging`, `current_action` |
| `GET /api/vehicles/summary` | Units, aging units, aging with no action, average age |
| `GET /api/vehicles/aging?limit=` | Oldest aging vehicles |
| `GET /api/vehicles/facets` | Makes and models for the filter menus |
| `GET /api/vehicles/:id/actions` | Action history |
| `POST /api/vehicles/:id/actions` | Log an action (`action_status`, `notes`); aging vehicles only |
| `GET /healthz`, `/readyz`, `/metrics` | Liveness, readiness, Prometheus metrics |

## Design choices

- **Scalability:** the API is stateless, so it scales horizontally. Compound indexes serve the aging and filter queries, and the latest action for a whole page is fetched in one aggregation (no N+1).
- **Performance:** server-side pagination, debounced search, and aborted requests so a slow old response never overwrites a newer one.
- **Reliability:** input validation (zod), rate limiting, graceful shutdown, a readiness probe tied to the database, read retries with backoff in the browser, and no retries on writes to avoid duplicate actions.
- **Maintainability:** age is derived from `date_received` and never stored; the aging rule is one config value; the frontend talks to one `lib/api.js` module and Next.js proxies `/api` to the backend, so there is no CORS setup.
- **Observability:** structured JSON logs (pino) with a request id that the browser sends and the API echoes back; Prometheus metrics (request duration histogram, aging-units gauge, process metrics); health and readiness endpoints.

## Before production

- **Authentication:** `backend/src/app.js` reads the dealership from an `x-dealership-id` header for the demo. Replace it with a verified OIDC/JWT claim so tenants cannot be spoofed.
- **Inventory sync:** add the scheduled worker that upserts vehicles from the dealership's DMS feed by VIN.
- **Tests:** add Jest and Supertest for the aging rule and API, and Playwright for the filter and log-action flow.
- **Tracing and alerts:** add OpenTelemetry and alerts as described in the design document.
- **Indexes:** turn off Mongoose `autoIndex` in production and manage indexes with migrations.

This code was drafted with GenAI and has not been run against a live database by the assistant; run it and review it before relying on it.
