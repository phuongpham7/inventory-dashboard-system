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
#    Edit .env and set JWT_SECRET to a random string of 32+ characters:
#    openssl rand -hex 32
npm install
npm run seed            # loads 240 demo vehicles
npm run -s token        # prints a test token for a manager of dealership-1: copy it
npm run dev

# 3. Frontend (http://localhost:3000), in a second terminal
cd frontend
cp .env.example .env.local
#    Edit .env.local and set API_TOKEN to the token from step 2
npm install
npm run dev
```

Open http://localhost:3000.

## What it does

- **Filterable inventory:** search (VIN, make, model), make, model, age bucket and sort. Filtering, sorting and paging run in MongoDB, 12 rows per request.
- **Aging stock:** vehicles in stock for more than 90 days (`AGING_DAYS` in `backend/.env`) are flagged in a pinned panel and in the table.
- **Actionable insights:** log a status or planned action on any aging vehicle. Actions are stored in an append-only `vehicle_actions` collection; the newest one is the vehicle's current action and the rest are history.

## Authentication

Every `/api` request needs `Authorization: Bearer <token>`. The API verifies the token and takes the dealership and role **only from the token**, so one dealership cannot see or change another's stock.

| Claim | Meaning |
|---|---|
| `dealership_id` | The dealership every query is limited to (name configurable with `DEALERSHIP_CLAIM`) |
| `role` | `manager` or `admin` can log actions; anything else (for example `viewer`) is read-only (`ROLE_CLAIM`) |
| `sub` | The user id, stored as `created_by` on each logged action |

- **Local development:** set `JWT_SECRET` (32+ characters) and create test tokens with `npm run -s token` (see below).
- **Production:** set `JWKS_URL` to your identity provider's public key endpoint (and `JWT_ISSUER` / `JWT_AUDIENCE`). Tokens are then verified with RS256 or ES256, and no shared secret exists.
- **Responses:** `401` for a missing, invalid or expired token; `403` if the token has no dealership or the role cannot perform the action.
- **Startup check:** the API refuses to start if neither `JWKS_URL` nor a long enough `JWT_SECRET` is set.

### Creating test tokens (`backend/scripts/make-token.js`)

There is no login page or identity provider yet, so this script stands in for one. It signs a token with your `JWT_SECRET`, and the API accepts it because it verifies with the same secret. **Development only:** anyone who knows `JWT_SECRET` can create a token for any dealership or role.

```bash
cd backend
npm run -s token                                  # manager of dealership-1 (the seeded data)
npm run -s token -- --role viewer                 # read-only: logging an action returns 403
npm run -s token -- --dealership dealership-2     # a different dealership: sees none of dealership-1's stock
npm run -s token -- --sub alice --expires 1h      # custom user id and lifetime
```

| Option | Default | Meaning |
|---|---|---|
| `--role` | `manager` | `manager` or `admin` can log actions; `viewer` is read-only |
| `--dealership` | `dealership-1` | The dealership the token can access |
| `--sub` | `demo-manager` | User id, saved as `created_by` on logged actions |
| `--expires` | `8h` | Lifetime, for example `1h`, `30m`, `7d` |

The `-s` flag keeps npm's own messages out, so the output is only the token. To use it:

- **Dashboard:** copy the token into `frontend/.env.local` as `API_TOKEN` and restart the frontend.
- **API directly:** `curl -H "Authorization: Bearer <token>" localhost:4000/api/vehicles/summary`

Good to know:

- Tokens expire (8 hours by default). If the dashboard starts showing 401 errors, create a new token and restart the frontend.
- Changing `JWT_SECRET` invalidates every token you made earlier.
- The script refuses to run if `JWT_SECRET` is missing or shorter than 32 characters. Generate one with `openssl rand -hex 32`.

**How the browser gets a token:** it doesn't. The Next.js server (`frontend/app/api/[...path]/route.js`) adds the token from `API_TOKEN` to each proxied request, so the token never reaches browser code. This is for the demo only: every visitor acts as that one user. For real use, add a sign-in (for example OIDC) and have the proxy forward each user's own token.

## API

All endpoints under `/api` require a token (see Authentication).

| Endpoint | Purpose |
|---|---|
| `GET /api/vehicles?make=&model=&q=&bucket=&sort=&page=&size=` | Filtered, paginated list with `age_days`, `is_aging`, `current_action` |
| `GET /api/vehicles/summary` | Units, aging units, aging with no action, average age |
| `GET /api/vehicles/aging?limit=` | Oldest aging vehicles |
| `GET /api/vehicles/aging/distribution` | Units per age band, split into action logged / no action (feeds the chart) |
| `GET /api/vehicles/facets` | Makes and models for the filter menus |
| `GET /api/vehicles/:id/actions` | Action history |
| `POST /api/vehicles/:id/actions` | Log an action (`action_status`, `notes`); aging vehicles only, `manager` or `admin` role |
| `GET /healthz`, `/readyz`, `/metrics` | Liveness, readiness, Prometheus metrics |

## Design choices

- **Scalability:** the API is stateless, so it scales horizontally. Compound indexes serve the aging and filter queries, and the latest action for a whole page is fetched in one aggregation (no N+1).
- **Performance:** server-side pagination, debounced search, and aborted requests so a slow old response never overwrites a newer one.
- **Security:** verified tokens with a fixed algorithm list, tenant and role taken only from the token, role check on writes, input validation, rate limiting before token checks, security headers (helmet), and user and dealership ids on every log line.
- **Reliability:** input validation (zod), rate limiting, graceful shutdown, a readiness probe tied to the database, read retries with backoff in the browser, and no retries on writes to avoid duplicate actions.
- **Maintainability:** age is derived from `date_received` and never stored; the aging rule is one config value; the frontend talks to one `lib/api.js` module and its Next.js server proxies `/api` to the backend, so there is no CORS setup.
- **Observability:** structured JSON logs (pino) with a request id that the browser sends and the API echoes back; Prometheus metrics (request duration histogram, aging-units gauge, process metrics); health and readiness endpoints.

## Before production

- **Real sign-in:** replace the demo `API_TOKEN` with each user's own token from your identity provider (OIDC), and set `JWKS_URL`.
- **Inventory sync:** add a scheduled sync from the dealership's DMS (see the design document).
- **Tracing and alerts:** add OpenTelemetry and alerts as described in the design document.
- **Indexes:** turn off Mongoose `autoIndex` in production and manage indexes with migrations.

This code was drafted with GenAI and has not been run against a live database by the assistant; run it and review it before relying on it.

## Dependency note

Next.js 14 bundles an older PostCSS that `npm audit` flags. `frontend/package.json` pins a patched PostCSS through `overrides`, which stays within the same major version. Do not use `npm audit fix --force`: it upgrades Next.js across major versions and can break the app. After pulling changes, delete `node_modules` and `package-lock.json`, then run `npm install` again.