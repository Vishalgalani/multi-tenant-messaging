# Multi-Tenant Messaging API

Production-oriented Node.js REST API for a simplified multi-tenant messaging platform. External providers send webhook events for delivery status updates. The service stores messages in PostgreSQL, enforces tenant isolation, and processes webhooks **idempotently** with explicit status-transition rules.

## Features

- Create messages (`QUEUED`) and fetch by ID
- Cursor-paginated conversation history with tenant isolation
- Idempotent provider webhooks (`eventId` uniqueness)
- Status progression with out-of-order protection
- Centralized validation, errors, structured logging, correlation IDs
- Health check with database connectivity probe
- Vitest + Supertest automated tests
- Docker Compose for local PostgreSQL

## Tech stack

| Concern | Choice |
|---|---|
| Runtime | Node.js 20+ (ES modules) |
| HTTP | Express.js |
| Database | PostgreSQL 16 |
| ORM / migrations | Prisma |
| Validation | Zod |
| Logging | Pino (+ pino-http) |
| Tests | Vitest + Supertest |
| Security | Helmet, CORS allow-list, rate limiting |

**Why Prisma?** Versioned SQL migrations, type-safe client, and straightforward transactions/`FOR UPDATE` via raw SQL for concurrent webhook updates—without introducing a second query layer.

## Quick start

### 1. Start PostgreSQL

```bash
docker compose up -d postgres
```

### 2. Configure environment

```bash
cp .env.example .env
```

Default `DATABASE_URL`:

```text
postgresql://messaging:messaging@localhost:5432/messaging?schema=public
```

### 3. Install and migrate

```bash
npm install
npm run db:migrate:dev
npm run db:seed
```

### 4. Run the API

```bash
npm run dev
# or
npm start
```

Server listens on `http://localhost:3000` by default.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start with `--watch` |
| `npm start` | Production start |
| `npm run db:migrate:dev` | Create/apply migrations (dev) |
| `npm run db:migrate` | Apply migrations (deploy) |
| `npm run db:seed` | Seed reference tenants |
| `npm test` | Run unit + integration tests |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |

## API endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | Public | Liveness + DB check |
| `POST` | `/api/v1/tenants` | Public | Create tenant (`id` from PostgreSQL `gen_random_uuid()`) |
| `POST` | `/api/v1/messages` | `x-tenant-id` | Create message |
| `GET` | `/api/v1/messages/:messageId` | `x-tenant-id` | Get message |
| `GET` | `/api/v1/conversations/:conversationId/messages` | `x-tenant-id` | List messages (`limit`, `cursor`) |
| `POST` | `/api/v1/webhooks/provider` | optional `x-webhook-secret` | Provider status event |

### Authentication assumption

For this exercise, **`x-tenant-id` is the tenant UUID returned by `POST /api/v1/tenants`** (stand-in for a JWT tenant claim). Create that tenant first; never invent UUIDs in the app — PostgreSQL assigns them. The body `tenantId` on message create must match the header.

When `WEBHOOK_SECRET` is set, provider webhooks must send matching `x-webhook-secret`.

### Success response shape

```json
{
  "success": true,
  "message": "Message created successfully",
  "data": {},
  "meta": null
}
```

Paginated list example `meta`:

```json
{
  "limit": 20,
  "hasMore": true,
  "nextCursor": "eyJjcmVhdGVkQXQiOiIyMDI2LT..."
}
```

### Error response shape

```json
{
  "success": false,
  "message": "Validation failed",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [],
    "correlationId": "..."
  }
}
```

## Sample curl

All primary keys (`tenants.id`, `messages.id`, `webhook_events.id`) are assigned by PostgreSQL via `gen_random_uuid()` — the application never invents them.

```bash
# 1) Create tenant (copy data.id from the response)
curl -s -X POST http://localhost:3000/api/v1/tenants \
  -H "Content-Type: application/json" \
  -d '{"name":"Tenant A"}'

# 2) Create message (replace TENANT_UUID)
curl -s -X POST http://localhost:3000/api/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: TENANT_UUID" \
  -d '{"tenantId":"TENANT_UUID","conversationId":"conv-100","to":"+919876543210","text":"Your Order has shipped"}'

# 3) Get message
curl -s http://localhost:3000/api/v1/messages/<MESSAGE_UUID> \
  -H "x-tenant-id: TENANT_UUID"

# 4) List conversation
curl -s "http://localhost:3000/api/v1/conversations/conv-100/messages?limit=20" \
  -H "x-tenant-id: TENANT_UUID"

# 5) Webhook
curl -s -X POST http://localhost:3000/api/v1/webhooks/provider \
  -H "Content-Type: application/json" \
  -d '{"eventId":"evt-001","messageId":"<MESSAGE_UUID>","status":"DELIVERED","occurredAt":"2026-10-16T08:30:00.000Z"}'
```

`npm run db:seed` also creates demo tenants with DB-generated UUIDs and prints them to the console.

Additional samples: `docs/sample-requests.http`, `docs/postman-collection.json`, OpenAPI: `docs/openapi.yaml`.

## Database schema

### `tenants`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | DB default `gen_random_uuid()` |
| `name` | VARCHAR(255) | Display name |
| `created_at` / `updated_at` | TIMESTAMPTZ | Audit |

### `messages`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | DB default `gen_random_uuid()` (not app-generated) |
| `tenant_id` | UUID FK → tenants | Isolation key |
| `conversation_id` | VARCHAR(128) | Conversation scope |
| `to` | VARCHAR(32) | E.164 destination |
| `text` | VARCHAR(4096) | Body |
| `status` | ENUM | `QUEUED\|SENT\|DELIVERED\|READ\|FAILED` |
| `status_updated_at` | TIMESTAMPTZ | Last applied status time |
| `sent_at` / `delivered_at` / `read_at` / `failed_at` | TIMESTAMPTZ? | Status timestamps |
| `created_at` / `updated_at` | TIMESTAMPTZ | Audit |

Indexes:

- `(tenant_id, conversation_id, created_at, id)` — conversation cursor pagination
- `(tenant_id, id)` — tenant-scoped get

### `webhook_events`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | DB default `gen_random_uuid()` |
| `event_id` | VARCHAR(128) UNIQUE | Provider idempotency key |
| `message_id` | UUID FK → messages (CASCADE) | Target message |
| `status` | ENUM | Incoming status |
| `occurred_at` | TIMESTAMPTZ | Provider event time |
| `applied` | BOOLEAN | Whether status changed |
| `reason` | VARCHAR(255) | Transition decision |
| `created_at` | TIMESTAMPTZ | Ingest time |

## Design notes

### Idempotency

1. Webhook processing runs in a **database transaction**.
2. `event_id` is the primary key — duplicates cannot create a second row.
3. On duplicate insert races (`P2002`), the handler loads the existing event and returns the original outcome (`duplicate: true`) **without re-applying** status effects.
4. The event row is written in the same transaction as any status update, so acknowledging HTTP 200 implies durable persistence.

### Status transitions

Forward rank: `QUEUED < SENT < DELIVERED < READ`.

| Rule | Behavior |
|---|---|
| Advancing transition | Applied; timestamps updated |
| Equal / backwards (e.g. `READ` → `SENT`) | Event stored, `applied=false`, message unchanged |
| `FAILED` from non-terminal | Applied; becomes terminal |
| From `READ` or `FAILED` | Always ignored (terminal) |

Skipping ranks is allowed (e.g. `QUEUED` → `DELIVERED`) so late lower-rank events do not regress state.

### Tenant isolation

All message reads filter by `tenant_id` from `x-tenant-id`. Cross-tenant IDs return **404** (not 403) to avoid existence leaks. Create requires body `tenantId === x-tenant-id`. Tenants are upserted on first message for local demos.

### Unknown message webhooks

Unknown `messageId` returns **404**. Alternative (not implemented): store unmatched events for later reconciliation when the message arrives—useful if create and webhook can race across services.

### Async work limitation

Webhook effects are applied **synchronously inside the request transaction**. There is no broker/worker. At higher throughput you would:

1. Persist the raw event quickly and ACK
2. Publish to Kafka/SQS/RabbitMQ
3. Process with workers, retries, backoff, and a dead-letter queue
4. Shard by `messageId` for ordered processing per message

Optimistic concurrency (`version` column) or `SELECT … FOR UPDATE` (used here) remains important.

## Testing

Use a dedicated `messaging_test` database (created separately from development data).

With local PostgreSQL:

```bash
psql -U postgres -h localhost -c "CREATE DATABASE messaging_test;"
$env:TEST_DATABASE_URL="postgresql://postgres:root@localhost:5432/messaging_test?schema=public"
$env:DATABASE_URL=$env:TEST_DATABASE_URL
npx prisma migrate deploy
npm test
```

Or with Docker Compose (port **5433**):

```bash
docker compose up -d postgres-test
$env:TEST_DATABASE_URL="postgresql://messaging:messaging@localhost:5433/messaging_test?schema=public"
$env:DATABASE_URL=$env:TEST_DATABASE_URL
npx prisma migrate deploy
npm test
```

`tests/setup.js` forces `TEST_DATABASE_URL` (or a local `messaging_test` default) so tests never mutate the development database.

Coverage includes:

- Successful create + get
- Validation failures
- Tenant isolation
- Duplicate `eventId`
- Out-of-order status (READ then SENT)
- Unknown message webhook → 404
- Conversation pagination
- Health check
- Unit tests for transition rules

## Environment variables

See `.env.example`. Required:

- `DATABASE_URL`

Optional:

- `PORT` (default `3000`)
- `LOG_LEVEL` (default `info`)
- `CORS_ORIGINS` (comma-separated)
- `WEBHOOK_SECRET`
- `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX`

## Project structure

```text
src/
  app.js
  server.js
  config/
  constants/
  middleware/
  modules/
    health/
    messages/
    webhooks/
  routes/
  utils/
prisma/
  schema.prisma
  migrations/
  seed.js
tests/
  unit/
  integration/
docs/
```

## Known limitations

- No JWT/OAuth; tenant header is a stand-in for authenticated identity
- No outbound provider send worker (messages stay `QUEUED` until webhooks arrive)
- Message body redacted in logs; still avoid shipping PII to shared log sinks without policy
- Single-region PostgreSQL; horizontal scale would need a broker + sticky/partitioned consumers

## License

MIT
