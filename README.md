# YMF Backend

Secure, production-ready backend for the **Young Ministers' Forum (YMF)** website.

Node.js + Express + TypeScript + **raw SQL via `pg` (node-postgres)** against
**Neon PostgreSQL**. No ORM. Communicates with the existing Next.js/React
frontend exclusively over REST APIs — the frontend never connects to the
database directly.

```text
Next.js Frontend  --HTTPS-->  Node.js/Express API  --pg (SSL)-->  Neon PostgreSQL
```

---

## 1. Tech stack

- **Runtime:** Node.js, TypeScript, Express
- **Database:** Neon PostgreSQL, accessed directly via `pg` (node-postgres) —
  parameterized raw SQL, no ORM
- **Validation:** Zod
- **Auth:** Argon2id password hashing, mandatory email OTP second factor, hashed
  session tokens in HttpOnly cookies
- **Security:** Helmet, CORS, express-rate-limit, request size limits
- **Email:** Resend (isolated behind `email.service.ts` so the provider can change
  without touching auth/registration logic)
- **Logging:** Pino (with secret redaction)
- **Testing:** Vitest + Supertest

---

## 2. Project structure

```text
ymf-backend/
├── src/
│   ├── config/        env.ts, database.ts (pg Pool singleton + query/tx helpers)
│   ├── controllers/   thin HTTP handlers
│   ├── routes/        route definitions, mounted under /api/v1
│   ├── services/      business logic + raw parameterized SQL queries
│   ├── middleware/     auth, validation, rate limiting, error handling
│   ├── schemas/        Zod schemas
│   ├── utils/          password/OTP/session crypto, logger, CSV, async wrapper,
│   │                   row-mapping helpers (snake_case DB -> camelCase API)
│   ├── types/          domain model types, Express request augmentation
│   ├── app.ts          Express app wiring
│   └── server.ts       process entry point
├── db/
│   ├── migrations/      plain .sql files, applied in filename order
│   ├── migrate.ts       tiny idempotent migration runner (tracks applied files)
│   └── seed.ts          idempotent admin seeding
├── tests/
├── .env.example
└── package.json
```

There is no schema file to "generate a client" from — every query is
hand-written, parameterized SQL living in `src/services/*.ts`, and the table
shape lives in `db/migrations/*.sql`.

---

## 3. Setting up Neon PostgreSQL

1. Create a free account at [neon.tech](https://neon.tech) and create a new **Project**.
2. Neon creates a default database for you (or create one named `ymf` from the
   Neon console: **Databases → New Database**).
3. Go to your project's **Dashboard → Connection Details**. Neon gives you two
   connection strings:
   - **Pooled connection** (host contains `-pooler`) — uses PgBouncer, used by
     the app's runtime connection pool.
   - **Direct connection** (no `-pooler`) — a direct connection to Postgres,
     recommended for running schema migrations (DDL behaves more predictably
     outside PgBouncer's transaction-pooling mode).
4. Copy both connection strings into your `.env`:

   ```env
   DATABASE_URL="postgresql://USER:PASSWORD@ep-xxxx-pooler.REGION.aws.neon.tech/ymf?sslmode=require"
   DIRECT_URL="postgresql://USER:PASSWORD@ep-xxxx.REGION.aws.neon.tech/ymf?sslmode=require"
   ```

   - **`DATABASE_URL`** (pooled) is what the running application's `pg.Pool`
     uses for all runtime queries.
   - **`DIRECT_URL`** (direct) is used only by `npm run db:migrate`. If you
     omit it, migrations fall back to `DATABASE_URL`.

Neon requires TLS; `sslmode=require` must remain in both URLs, and the app
connects with `ssl: { rejectUnauthorized: true }` — certificate verification
is never disabled.

---

## 4. Local setup

```bash
cd ymf-backend
npm install
cp .env.example .env
# Edit .env: DATABASE_URL, DIRECT_URL, ADMIN_EMAILS, SESSION_SECRET, RESEND_API_KEY, EMAIL_FROM, FRONTEND_URL
```

Generate a strong `SESSION_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Run migrations

```bash
npm run db:migrate
```

This applies every `.sql` file in `db/migrations/` in filename order, exactly
once — applied filenames are tracked in a `_migrations` table it creates
automatically, so re-running the command is always safe. To add a schema
change later, add a new file like `db/migrations/0002_add_something.sql` and
run the command again; already-applied files are skipped.

### Seed the initial administrator(s)

```bash
npm run db:seed
```

This reads `ADMIN_EMAILS` from `.env` (comma-separated). For each email:

- **If the admin does not exist:** a cryptographically secure random password
  is generated, hashed with Argon2id, the admin row is inserted, and the
  plaintext password is emailed once to that address. It is never logged or
  returned by any API.
- **If the admin already exists:** nothing happens — no password reset, no
  email resend, no deletion. The seed is safe to re-run at any time (e.g. on
  every deploy).

### Inspect data

Use any Postgres client you like against the Neon connection string — e.g.
`psql "$DATABASE_URL"`, [TablePlus](https://tableplus.com/), or Neon's own
web-based SQL editor in the project dashboard.

### Run the server

```bash
npm run dev     # tsx watch, auto-reload
npm run build && npm start   # production build
```

### Run tests

```bash
npm test
```

Pure unit tests (utils, Zod schemas) run with no database. The integration
tests in `tests/integration.test.ts` require `DATABASE_URL` to point at a
**disposable Neon branch dedicated to testing** (with migrations already
applied) and are skipped automatically if it isn't set.

---

## 5. Authentication flow (non-negotiable security rule)

An administrator **never** reaches the dashboard with email + password alone.
Every login requires:

```text
Email + Password  →  fresh single-use Email OTP  →  session
```

```text
POST /auth/login          → validates password, emails a fresh OTP
POST /auth/verify-otp     → validates OTP, creates session, sets HttpOnly cookie
GET  /auth/me             → returns the authenticated admin (requires session)
POST /auth/logout         → invalidates the session, clears the cookie
```

- OTPs are 6 digits, generated with Node's CSPRNG (`crypto.randomInt`), hashed
  (HMAC-SHA256) before storage, expire after `OTP_EXPIRES_MINUTES` (default 10),
  are single-use, and allow at most `OTP_MAX_ATTEMPTS` (default 5) guesses.
  Requesting a new OTP invalidates all previous unused OTPs for that admin
  (done inside a single SQL transaction).
- Session tokens are high-entropy random values; only their SHA-256 hash is
  stored. The raw token lives solely in an `HttpOnly`, `SameSite=Lax` cookie
  (`Secure` in production) named `ymf_admin_session`.
- Passwords are hashed with Argon2id. Plaintext passwords are never stored,
  logged, or returned by any endpoint.

---

## 6. Database access pattern

- `src/config/database.ts` exports a single `pg.Pool` (`pool`), a `query()`
  helper for one-off parameterized statements, and `withTransaction()` for
  multi-statement operations that must succeed or fail together (e.g.
  invalidating old OTPs + inserting a new one).
- **Every** query is parameterized (`$1, $2, ...`) — user input is never
  concatenated into SQL strings. Dynamic `ORDER BY` columns are resolved
  through a fixed allow-list map (see `SORT_COLUMN_MAP` in the service files),
  never taken directly from request input.
- Table/column names use `snake_case` (standard Postgres convention);
  `src/utils/mappers.ts` translates each row into the camelCase shape used by
  the rest of the app and the JSON API.
- `gifts` is stored as `JSONB`. Node writes it with `JSON.stringify(...)` on
  insert; `pg` automatically parses `jsonb` columns back into JS objects on
  read.

---

## 7. API reference

Base path: `/api/v1`. All responses are JSON of the shape
`{ success: boolean, message?: string, ... }`.

### Auth

| Method | Path | Auth | Body | Notes |
|---|---|---|---|---|
| POST | `/auth/login` | none | `{ email, password }` | Rate limited (5/15min/IP). Always returns a generic message. |
| POST | `/auth/verify-otp` | none | `{ email, otp }` | Sets `ymf_admin_session` cookie on success. |
| POST | `/auth/resend-otp` | none | `{ email }` | Rate limited (3/15min). Generic response regardless of account existence. |
| POST | `/auth/logout` | session | — | Invalidates DB session + clears cookie. |
| GET | `/auth/me` | session | — | Returns `{ admin: { id, email } }`. |

**Login → OTP example**

```http
POST /api/v1/auth/login
Content-Type: application/json

{ "email": "admin@example.com", "password": "correct-password" }
```

```json
{ "success": true, "message": "A verification code has been sent to your email." }
```

```http
POST /api/v1/auth/verify-otp
Content-Type: application/json

{ "email": "admin@example.com", "otp": "483921" }
```

```json
{ "success": true, "message": "Login successful.", "admin": { "id": "...", "email": "admin@example.com" } }
```

Error responses use `401` with a generic message
(`"Invalid email or password."` / `"Invalid or expired verification code."`) —
the API never reveals whether an email exists, whether the password or OTP was
wrong, or whether an account is disabled.

### Public forms

| Method | Path | Auth | Body |
|---|---|---|---|
| POST | `/subscriptions` | none | `{ email }` |
| POST | `/registrations` | none | see below |

```http
POST /api/v1/registrations
Content-Type: application/json

{
  "fullName": "John Doe",
  "whatsapp": "+2348000000000",
  "email": "john@example.com",
  "location": "Ibadan, Nigeria",
  "gender": "male",
  "soundDoctrine": true,
  "activeFellowship": true,
  "intent": "I want to grow and advance the gospel...",
  "gifts": { "writing": true, "media": false, "intercession": true, "onGround": false },
  "giftOther": ""
}
```

`201 Created` on first registration, `200 OK` on a duplicate email — both
return the identical generic message so the API never reveals whether an
email has already registered. `soundDoctrine` and `activeFellowship` must both
be `true`. Both public endpoints are rate limited.

Validation error example (`400`):

```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": { "email": "Invalid email address" }
}
```

### Admin (all require a valid session cookie)

| Method | Path | Notes |
|---|---|---|
| GET | `/admin/dashboard` | Aggregate statistics + last 10 registrations. |
| GET | `/admin/members?page=&limit=&search=&status=&sortBy=&sortOrder=` | `limit` max 100. `sortBy` ∈ `createdAt,fullName,status`. |
| GET | `/admin/members/:id` | Full member record. |
| PATCH | `/admin/members/:id/status` | Body: `{ "status": "approved" }`. |
| GET | `/admin/subscribers?page=&limit=&search=&isActive=&sortBy=&sortOrder=&from=&to=` | |
| PATCH | `/admin/subscribers/:id` | Body: `{ "isActive": false }`. |
| GET | `/admin/export/members` | Streams a CSV file. |
| GET | `/admin/export/subscribers` | Streams a CSV file. |

Pagination shape:

```json
{ "success": true, "data": [ /* ... */ ], "pagination": { "page": 1, "limit": 20, "total": 248, "totalPages": 13 } }
```

Unauthenticated or expired-session requests to any `/admin/*` route return
`401 Unauthorized`.

### Misc

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | `{ success, status }`. Runs `SELECT 1` to check DB connectivity; never exposes credentials. |

---

## 8. Security checklist

- [x] Argon2id for all password hashing
- [x] Mandatory email OTP second factor — password alone never grants access
- [x] OTP and session tokens stored only as hashes; single-use, expiring OTPs
- [x] HttpOnly, `SameSite=Lax`, `Secure`-in-production session cookie
- [x] Helmet, strict CORS (single allow-listed origin, credentials enabled)
- [x] express-rate-limit on all auth and public form endpoints
- [x] Zod validation on every request body/query/params, server-side (never
      trusts frontend validation alone)
- [x] Every SQL query is parameterized; no string concatenation of user input
      into SQL, including sortable columns (resolved via a fixed allow-list)
- [x] Centralized error handler translating Postgres error codes (unique/FK/
      check violations) into safe HTTP responses; no stack traces leaked in
      production
- [x] Structured logging with automatic redaction of secrets
- [x] `.env` git-ignored; `.env.example` contains placeholders only
- [x] Admin, member, and subscriber data all sit behind authentication —
      nothing personal is ever exposed on a public endpoint

---

## 9. Deployment

The backend is a standalone Node.js service — deploy it independently of the
Next.js frontend on Railway, Render, Fly.io, a VPS, or any Node-compatible
host.

1. Set all variables from `.env.example` in your host's environment/secret
   manager (never commit `.env`).
2. Build: `npm run build`
3. Run migrations against Neon: `npm run db:migrate`
4. Seed admins (safe to re-run): `npm run db:seed`
5. Start: `npm start`
6. Point `FRONTEND_URL` at your deployed Next.js origin (exact scheme + host,
   no wildcard) and set the frontend's API base URL to this backend's public
   HTTPS URL.
7. Confirm `GET /health` returns `200` before routing traffic to the instance.

Because `DATABASE_URL` uses Neon's **pooled** endpoint, and the app keeps a
modest pool size (`max: 10` in `src/config/database.ts`), it's safe to run
multiple instances without exhausting Neon's connection limit.

---

## 10. Frontend integration notes

- `/admin/login`, `/admin/verify-otp`, `/admin/dashboard`, `/admin/members`,
  `/admin/members/[id]`, `/admin/subscribers` pages in the Next.js app should
  call this backend with `credentials: "include"` so the session cookie is
  sent/received.
- The existing registration and subscription forms should be wired to
  `POST /api/v1/registrations` and `POST /api/v1/subscriptions` respectively,
  preserving their current visual design — only the `handleSubmit` logic
  changes (loading state, disable-while-submitting, validation/network/server
  error handling, then the existing success screen).
#   b a c k e n d  
 