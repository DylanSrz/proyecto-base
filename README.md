# FleetCore API

REST API to manage the maintenance lifecycle of the FleetCore vehicle fleet:
vehicles, mechanics, workshops and preventive/corrective maintenances, with
JWT authentication, role-based authorization and an API-key endpoint for
external integrations.

**Stack:** NestJS 12 (ESM) · TypeScript (strict) · TypeORM · PostgreSQL · JWT ·
bcryptjs · class-validator · Swagger · Vitest + Supertest · Docker

## Coder

| Name | Clan |
|------|------|
| _your name_ | _your clan_ |

---

## Quick start

### Option A: local Node.js + PostgreSQL in Docker

```bash
cp .env.example .env              # first time only
docker compose up -d db           # PostgreSQL on localhost:5433
npm install
npm run seed                      # builds and loads the demo data (safe to run twice)
npm run start:dev
```

### Option B: everything in Docker

```bash
cp .env.example .env
docker compose up -d --build      # API on localhost:3000 + PostgreSQL (named volume, internal network)
docker compose exec api npm run seed:prod
```

- API base URL: `http://localhost:3000/api`
- **Swagger: http://localhost:3000/docs** (use **Authorize** for the Bearer token or the `x-api-key`)

## Environment variables

Validated at startup with Zod (`src/config/env.schema.ts`); the app refuses to start if one is missing or invalid.

| Variable | Example | Description |
|---|---|---|
| `NODE_ENV` | `development` | `development`, `production` or `test` |
| `PORT` | `3000` | HTTP port |
| `DB_HOST` / `DB_PORT` | `localhost` / `5433` | PostgreSQL host and port |
| `DB_USER` / `DB_PASSWORD` | `postgres` / `postgres` | PostgreSQL credentials |
| `DB_NAME` | `fleetcore` | Database name |
| `DB_SYNC` | `true` | Let TypeORM synchronize the schema |
| `JWT_SECRET` | 32+ characters | Secret used to sign tokens |
| `JWT_EXPIRES_IN` | `3600` | Token lifetime in seconds |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | `admin@fleetcore.com` / `Admin12345` | Admin account created on boot and by the seed |
| `API_KEYS` | `demo-key-partner-1,demo-key-partner-2` | Comma-separated keys accepted in the `x-api-key` header |

`.env.test` (committed on purpose) points to the test database only.

## Seed data and test credentials

`npm run seed` is idempotent: every record is looked up by a natural key
(email, plate, name...) before being inserted, so running it again creates nothing new.

| Role | Email | Password | Notes |
|---|---|---|---|
| ADMIN | `admin@fleetcore.com` | `Admin12345` | From `ADMIN_EMAIL` / `ADMIN_PASSWORD` |
| TECHNICIAN | `carlos.perez@fleetcore.com` | `Tech12345` | Linked to mechanic Carlos Perez |
| TECHNICIAN | `laura.gomez@fleetcore.com` | `Tech12345` | Linked to mechanic Laura Gomez |

| Data | Records |
|---|---|
| Mechanics | Carlos Perez (ACTIVE), Laura Gomez (ACTIVE), Andres Rios (INACTIVE) |
| Workshops | North Workshop (ACTIVE), Downtown Workshop (INACTIVE) |
| Vehicles | `ABC123` AVAILABLE, `DEF456` AVAILABLE, `GHI789` IN_MAINTENANCE, `JKL012` INACTIVE |
| Maintenances | 2 COMPLETED on `ABC123` (history), 1 IN_PROGRESS on `GHI789`, 1 SCHEDULED on `DEF456` |

`docs/fleetcore.sql` contains a `pg_dump` of the schema with this data.

## Roles

- **ADMIN**: manages vehicles, mechanics, workshops and maintenances; reads histories and the audit trail.
- **TECHNICIAN**: sees the maintenances assigned to their mechanic profile (with vehicle and workshop)
  and can move them `SCHEDULED → IN_PROGRESS → COMPLETED`.
- Public sign-up (`POST /auth/register`) always creates a TECHNICIAN; the admin only comes from the seed.
  An admin links a technician account to a mechanic with `userId`.

## Endpoints

All routes are under `/api` and require `Authorization: Bearer <token>` unless stated otherwise.

### Auth
| Method | Route | Access | Notes |
|---|---|---|---|
| POST | `/auth/register` | Public | Creates a TECHNICIAN and returns a JWT; duplicated email → 409 |
| POST | `/auth/login` | Public | Email + password → JWT |
| GET | `/users/me` | Any role | Logged-in user |
| GET | `/users`, `/users/:id` | ADMIN | |

### Vehicles
| Method | Route | Access | Notes |
|---|---|---|---|
| POST | `/vehicles` | ADMIN | Unique plate (409); starts AVAILABLE |
| GET | `/vehicles` | ADMIN, TECHNICIAN | Paginated; filters `status`, `search` |
| GET | `/vehicles/plate/:plate` | ADMIN, TECHNICIAN | Lookup by plate |
| GET | `/vehicles/:id` | ADMIN, TECHNICIAN | |
| PATCH | `/vehicles/:id` | ADMIN | Data only; mileage cannot decrease |
| PATCH | `/vehicles/:id/deactivate` | ADMIN | Logical deletion → INACTIVE; 409 with an active maintenance |
| PATCH | `/vehicles/:id/activate` | ADMIN | INACTIVE → AVAILABLE |
| GET | `/vehicles/:id/maintenances` | ADMIN | Maintenance history of the vehicle |

### Mechanics
| Method | Route | Access | Notes |
|---|---|---|---|
| POST | `/mechanics` | ADMIN | Unique email; optional `userId` of a TECHNICIAN |
| GET | `/mechanics` | ADMIN | Paginated; filters `status`, `search` |
| GET | `/mechanics/me` | TECHNICIAN | Own mechanic profile |
| GET | `/mechanics/:id` | ADMIN | |
| PATCH | `/mechanics/:id` | ADMIN | |
| PATCH | `/mechanics/:id/activate`, `/deactivate` | ADMIN | History is kept; 409 with active maintenances |
| GET | `/mechanics/:id/maintenances` | ADMIN | Maintenances assigned to the mechanic |

### Workshops
| Method | Route | Access | Notes |
|---|---|---|---|
| POST | `/workshops` | ADMIN | Unique name |
| GET | `/workshops` | ADMIN, TECHNICIAN | Active workshops; admins may add `includeInactive=true` |
| GET | `/workshops/:id` | ADMIN, TECHNICIAN | |
| PATCH | `/workshops/:id` | ADMIN | |
| PATCH | `/workshops/:id/activate`, `/deactivate` | ADMIN | 409 with active maintenances |

### Maintenances
| Method | Route | Access | Notes |
|---|---|---|---|
| POST | `/maintenances` | ADMIN | Creates a SCHEDULED maintenance (rules below) |
| GET | `/maintenances` | ADMIN | Paginated; filters `status`, `type`, `vehicleId`, `mechanicId`, `workshopId` |
| GET | `/maintenances/active` | ADMIN | SCHEDULED + IN_PROGRESS |
| GET | `/maintenances/mine` | TECHNICIAN | Own assignments with vehicle and workshop |
| GET | `/maintenances/:id` | ADMIN, assigned TECHNICIAN | Others get 403 |
| GET | `/maintenances/:id/audit` | ADMIN | Status change log (who, when, from → to) |
| PATCH | `/maintenances/:id/status` | ADMIN, assigned TECHNICIAN | Status change (rules below) |

### Integrations
| Method | Route | Access | Notes |
|---|---|---|---|
| GET | `/integrations/vehicles/:plate/maintenances` | `x-api-key` header | Vehicle + maintenance history for partners; missing/wrong key → 401 |

## Business rules

**Creating a maintenance**
- Vehicle, mechanic and workshop must exist (404) and be active; an INACTIVE vehicle, or an
  inactive mechanic or workshop → 409.
- A vehicle can have only one active (SCHEDULED/IN_PROGRESS) maintenance → 409.
- A mechanic cannot have two active maintenances whose schedules overlap, in the same or a different
  workshop → 409. Ranges `[scheduledAt, estimatedEndAt)` are compared, so 07:30–09:00 and
  09:00–10:00 are allowed but 07:30–09:00 and 08:00–… are not.
- `mileage` cannot be lower than the vehicle mileage (400); `estimatedEndAt` must be after `scheduledAt` (400).

**Status transitions** (`PATCH /maintenances/:id/status`)

| From → To | Effect |
|---|---|
| SCHEDULED → IN_PROGRESS | Vehicle → IN_MAINTENANCE. The mechanic cannot have another IN_PROGRESS maintenance |
| IN_PROGRESS → COMPLETED | Requires `workPerformed`, `finalCost`, `finishedAt`, `finalMileage` (400 if missing). Vehicle → AVAILABLE, mileage updated |
| SCHEDULED/IN_PROGRESS → CANCELLED | ADMIN only. Vehicle → AVAILABLE if it was IN_PROGRESS |
| Anything else | 409 with a descriptive message, e.g. `Cannot change maintenance status from COMPLETED to IN_PROGRESS: ...` |

- `finalMileage` ≥ maintenance mileage; `finishedAt` cannot be before the start or in the future.
- Every change (maintenance + vehicle + audit log) is saved in a single database transaction with row locks.

## Response format

```json
{ "success": true, "statusCode": 200, "data": {}, "timestamp": "2026-10-20T19:00:00.000Z" }
```

```json
{ "success": false, "statusCode": 409, "message": "Vehicle ABC123 already has an active maintenance",
  "path": "/api/maintenances", "timestamp": "2026-10-20T19:00:00.000Z" }
```

Validation, authentication, authorization, not-found and business/uniqueness conflicts are always
4xx, never 500 (`src/common/filters/all-exceptions.filter.ts`).

## Tests

```bash
npm run test        # unit tests (Vitest)
npm run test:cov    # unit tests + coverage over all of src/ (HTML report in coverage/)
docker compose up -d db_test   # e2e database on localhost:5434
npm run test:e2e    # e2e tests (Supertest) against the real app
```

The e2e suite (`test/maintenances.e2e-spec.ts`) covers the full flow: setup through the API, 401/403,
scheduling conflicts, the technician workflow, invalid transitions, the audit trail and the API key.

**Postman evidence:** import `docs/postman/fleetcore.postman_collection.json`, run `npm run seed`
and execute the collection (Collection Runner or `npx newman run docs/postman/fleetcore.postman_collection.json`).
It covers the main scenarios with assertions and can be run repeatedly.

## Project structure

```
src/
  common/        guards (JWT, roles, API key), decorators (@Public, @Roles, @Auth, @CurrentUser, @ApiKeyAuth),
                 interceptor, exception filter, enums, pagination
  config/        environment validation
  modules/
    auth/ users/           sign-up, login, JWT
    vehicles/ mechanics/ workshops/
    maintenances/          lifecycle, transitions, audit log, history endpoints
    integrations/          x-api-key endpoint
    database/              seed service and `npm run seed` entry point
test/            e2e specs
docs/            statement, SQL dump, Postman collection
```
