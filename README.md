# Dhaka Tesla Pool

Share a seat. Split the fare. Survive Dhaka traffic.

Passengers request a seat from one Dhaka area to another. Jashim, the driver, can carry two of them in Bullet, his three-seat Tesla, when both start in the same area and their drop-offs are at most 2 km apart. Each passenger pays their own fare, 15% less when shared, and sees only their own ride.

> **Live demo:** https://tesla-pool-web-eight.vercel.app — sign in with any [demo login](#demo-logins). No cold start to wait through: the first page loads in about a second.
>
> **Demo video:** _not recorded yet. Replace this line with the Loom link._ The outline is in [Video outline](#video-outline).

![Driver dashboard: Nusrat and Rafiq sharing Bullet](docs/screenshots/driver-dashboard.png)

## Contents

- [The problem](#the-problem)
- [Features](#features)
- [Screenshots](#screenshots)
- [Architecture](#architecture)
- [Data model](#data-model)
- [Ride lifecycle](#ride-lifecycle)
- [Matching and fares](#matching-and-fares)
- [The last seat: concurrency](#the-last-seat-concurrency)
- [Tech stack and why](#tech-stack-and-why)
- [Project structure](#project-structure)
- [Run it](#run-it)
- [Demo logins](#demo-logins)
- [Tests](#tests)
- [API overview](#api-overview)
- [Deployment](#deployment)
- [Assumptions](#assumptions)
- [Trade-offs, limits, next steps](#trade-offs-limits-next-steps)
- [Git workflow](#git-workflow)
- [AI usage](#ai-usage)
- [If Oi Tesla goes viral](#if-oi-tesla-goes-viral)
- [Video outline](#video-outline)

## The problem

At 8:41 on Banani Road 11, Nusrat books a ride to Mohakhali. Two minutes later Rafiq books Banani to Gulshan 1. Bullet has three seats. The app has to decide whether they can share, split the fare fairly, never put a fourth person in a three-seat car, and keep enough history to explain what happened. Thirty seconds later Shirin tries for the last seat.

Three actors:

- **Passenger** (Nusrat, Rafiq, Shirin): sign up or in, request a ride, see the estimate, track status, cancel while allowed, pay, see history.
- **Driver / Tesla** (Jashim, Bullet, 3 seats): sign in, go online or offline, see waiting requests while online, accept, mark arrival, start, drop riders off, complete once every fare is paid, see riders and past trips.
- **Pool / ride**: several requests can share one Tesla. Seats never exceed capacity. Each rider has an individual fare. Every step is written to an append-only event log.

## Features

| Area | What works |
| --- | --- |
| Accounts | Passenger sign-up (with an empty TeslaPay wallet), sign-in for everyone, httpOnly JWT cookie, sign-out, session survives refresh |
| Booking | Pickup, destination, seats (1–3), live solo and shared estimate computed with the same code the API charges with |
| Tracking | Current ride with a lifecycle stepper, open rides table, activity feed from `ride_events`, polling every few seconds |
| Notifications | Side pop-ups for what someone else just did (accepted, a rider joined or left, arrived, started, dropped off, new request, cancelled, paid) and a centred "Trip completed" card when the trip closes |
| Driver | Online switch (waiting requests are hidden while offline), open trip with seat map, riders, and who has paid, waiting requests with a "does it fit" hint, arrive → start → drop off → complete |
| Pooling | Same pickup and drop-offs within 2 km; capacity enforced in one transaction; fares re-priced when a rider joins or leaves |
| Payment | Each rider pays once dropped off, by cash or a TeslaPay debit that fails cleanly on low balance; the trip cannot complete until everyone has paid |
| History | Passenger: finished rides with payment. Driver: finished pools with riders and fares collected |
| Ops | `docker compose up` migrates, seeds the cast, and health-checks all three containers |

## Screenshots

| Sign in | Passenger dashboard |
| --- | --- |
| ![Sign-in page with the story cast](docs/screenshots/login.png) | ![Nusrat's dashboard with her shared ride](docs/screenshots/passenger-dashboard.png) |
| **Book a ride** | **Fare rules** |
| ![Booking form with the fare estimate](docs/screenshots/book-ride.png) | ![Fare rules with Nusrat and Rafiq worked by hand](docs/screenshots/fare-rules.png) |

## Architecture

```mermaid
flowchart LR
  B["Browser<br/>passenger or driver"] -->|"httpOnly token cookie"| W["Next.js 15<br/>apps/web<br/>pages + /api route handlers"]
  W -->|"HTTP + forwarded cookie"| A["Express API<br/>apps/api"]
  A -->|"SQL, Drizzle ORM"| D[("PostgreSQL 16")]
  A -.->|imports| R["packages/domain<br/>distance, fare, match"]
  W -.->|imports| R
  M["migrate.js<br/>before the API listens"] --> D
```

Source: [docs/architecture/architecture.mmd](docs/architecture/architecture.mmd).

- The **browser only talks to Next.js**. Each `/api/*` route handler in `apps/web/app/api` forwards the request and the `token` cookie to Express. The cookie is set on the site's own origin, so there is no CORS setup and the token is never readable by page JavaScript.
- **Express owns every rule**: who may do what, status transitions, seat counts, fares, payments. The site's "fits / does not fit" hints are advice; the API checks again.
- **`packages/domain`** holds the pure functions (distance, fare, sharing rule). They touch no database, so they are unit-tested directly and imported by both apps. The estimate on screen is the same function Express charges with.
- **Postgres** stores the rows and enforces the invariants that matter most with constraints, not only with code.

## Data model

![ERD](docs/erd/erd.svg)

Source: [docs/erd/erd.mmd](docs/erd/erd.mmd). Migrations are plain SQL in [apps/api/src/db/migrations](apps/api/src/db/migrations), one table per file (0001–0010), then 0011–0012 add the `dropped_off` status.

| Table | Why it exists | Key constraints |
| --- | --- | --- |
| `users` | Passengers and drivers | `email` unique, `role` enum, bcrypt `password_hash` |
| `vehicles` | Bullet: capacity and online flag | one vehicle per driver, `capacity > 0` |
| `areas` | The fixed Dhaka places with lat/lng | `code` primary key, referenced by requests |
| `ride_requests` | One passenger's request, status, and their fare | `seats > 0`, pickup ≠ destination, `status` enum, FK to pool |
| `pools` | One Tesla trip that may carry several requests | `0 ≤ seats_taken ≤ capacity` (CHECK), **one live pool per vehicle** (partial unique index) |
| `pool_members` | Which request is in which pool, with seats and fare | a request joins at most one pool |
| `ride_events` | Append-only history: who moved what from which status to which | must reference a pool or a request; indexed by both |
| `wallets` | TeslaPay balance in poisha | balance never below zero (CHECK) |
| `payments` | One settlement per request | unique per request, amount > 0, `method` enum |
| `schema_migrations` | Which SQL files have run | created by `migrate.js` |

**Money is integer poisha** (100 poisha = 1 BDT) in `integer` columns. Floats cannot represent 0.1 exactly and would drift when fares are summed or discounted; `numeric` would work but adds decimal handling to every calculation for no gain at this scale. Display divides by 100 only at the last moment.

## Ride lifecycle

```mermaid
stateDiagram-v2
  [*] --> requested: passenger books
  requested --> matched: driver accepts
  matched --> driver_arrived: driver marks arrival
  driver_arrived --> started: driver starts
  started --> dropped_off: driver drops riders off
  dropped_off --> completed: driver completes, once every rider has paid
  requested --> cancelled: passenger cancels
  matched --> cancelled: passenger cancels
  driver_arrived --> cancelled: passenger cancels
  completed --> [*]
  cancelled --> [*]
```

- A **request** moves `requested → matched → driver_arrived → started → dropped_off → completed`, or to `cancelled` before `started`.
- A **pool** is Bullet's trip: `accepted → driver_arrived → started → dropped_off → completed` (or `cancelled` when its last rider leaves). The driver moves the pool; every member request moves with it in the same transaction.
- Why two state machines: the driver acts on the car's trip, the passenger acts on their own request. Keeping them separate means Rafiq can cancel without touching Nusrat's row.
- Any other jump returns **409**, for example completing before starting, or cancelling after the trip started. New riders can join only while the pool is `accepted`; once Jashim is at the pickup, the seats are locked.
- **Pay before complete.** At `dropped_off` each rider pays their own fare. `/pools/:id/complete` answers `409 waiting for payment from Rafiq` until every member has a payment row, so a trip is never closed with money still owed. A Tesla in `dropped_off` still counts as busy (the one-live-pool index includes it).
- Paying is recorded as a `payments` row plus an event (`to_status = 'paid'`) rather than a status of its own; the request stays `dropped_off` until the driver completes the whole trip.

## Matching and fares

**Sharing rule.** Two requests may share a Tesla when they have the **same pickup area** and their **drop-offs are at most 2 km apart** (straight line between area centers). Every member of a pool must fit every newcomer.

- Nusrat (Banani → Mohakhali) and Rafiq (Banani → Gulshan 1): drop-offs are **1.96 km** apart, so they share.
- Shirin (Banani → Dhanmondi): 4.19 km from Mohakhali, so she is refused with `409 ride does not fit this pool`.

**Fare**, in poisha, from [packages/domain/fare.js](packages/domain/fare.js):

```
passengerFare = baseFare + distanceCharge − poolDiscount
baseFare       = 4000                      (৳40)
distanceCharge = 250 per 100 m, distance rounded to the nearest 100 m
poolDiscount   = 15% of (base + distance), rounded half-up, only when sharing
```

Check it by hand:

| | Nusrat · Banani → Mohakhali | Rafiq · Banani → Gulshan 1 |
| --- | --- | --- |
| Distance | 1913 m → billed 1900 m | 1783 m → billed 1800 m |
| Distance charge | 19 × 250 = 4750 | 18 × 250 = 4500 |
| Solo fare | 4000 + 4750 = **8750** (৳87.50) | 4000 + 4500 = **8500** (৳85.00) |
| Pool discount | round(8750 × 15%) = 1313 | round(8500 × 15%) = 1275 |
| Shared fare | **7437** (৳74.37) | **7225** (৳72.25) |

A request stores the solo estimate. When a second rider joins, both members are re-priced to the shared fare in the accept transaction. If one cancels and a single rider is left, that rider goes back to the solo fare.

## The last seat: concurrency

Bullet has one free seat. Nusrat's and Shirin's accepts arrive at the same instant and both read "1 seat left". What stops both from committing:

1. The accept runs in **one transaction** and reads the open pool with `SELECT … FOR UPDATE`, so the second transaction waits for the first.
2. The seat update is **conditional**: `UPDATE pools SET seats_taken = seats_taken + $n WHERE id = $id AND seats_taken + $n <= capacity`. If no row comes back, the API answers `409 not enough seats`.
3. The table itself has `CHECK (seats_taken <= capacity)`, so even a bug in the code cannot store a fourth passenger.
4. When no pool exists yet, two accepts could both try to create one. The partial unique index "one live pool per vehicle" lets only one insert succeed; the other gets `409`.

The test [last-seat.test.js](apps/api/test/last-seat.test.js) fires both accepts with `Promise.all` and asserts one `201` with 3/3 seats and one `409`.

**At larger scale** the row lock becomes a hot spot on popular pools. See [If Oi Tesla goes viral](#if-oi-tesla-goes-viral).

## Tech stack and why

| Choice | Picked | Realistic alternatives | Why it fits a ride-pooling MVP | Would switch when |
| --- | --- | --- | --- | --- |
| Frontend | **Next.js 15 (App Router)**, plain CSS | React + Vite, Remix | Mandated React/Next; route handlers give a same-origin proxy so the JWT stays in an httpOnly cookie with no CORS | Pages need SSR data per user at scale, or a mobile app replaces the site |
| Styling | **Hand-written CSS** with design tokens | Tailwind, MUI | One file, no build plugin, full control of the admin-dashboard theme | Several people build UI and need a shared component library |
| Backend | **Express 4** | Fastify, NestJS | Small, well known, easy to read in an interview; the API is ~20 routes | Validation and routes grow enough that Nest's modules or Fastify's schemas pay off |
| API style | **REST** | GraphQL, tRPC | Resources map cleanly (rides, pools, vehicles); status codes carry the rule violations (403, 409) | Many clients need different shapes of the same data |
| Database | **PostgreSQL 16** | MySQL, SQLite, MongoDB | Capacity is a relational invariant: row locks, CHECK constraints, partial unique indexes, transactions | Geo search at city scale (add PostGIS) or write volume beyond one primary |
| ORM | **Drizzle** + plain SQL migrations | Prisma, Knex, raw `pg` | Typed query builder that still shows the SQL; `FOR UPDATE` and conditional updates stay explicit | Team prefers generated migrations and a schema-first workflow |
| Migrations | **Own `migrate.js`**, one SQL file per table | drizzle-kit, node-pg-migrate | 60 lines, runs before the API, advisory lock, one transaction per file | Need down-migrations or many environments |
| Auth | **JWT in an httpOnly cookie**, bcrypt | Sessions in Postgres, NextAuth, Clerk | No session table for a demo; cookie not readable by JS; 7-day expiry | Need revocation or "sign out everywhere" (move to server sessions) |
| Tests | **`node:test`** against the running API | Jest, Vitest, Supertest | Zero dependencies; tests hit the real Postgres so locks and constraints are actually exercised | Need mocking, watch mode, or coverage reports |
| Hosting | **Vercel** functions + **Neon** Postgres (live); Docker Compose locally | Render, Railway, Fly.io, a VPS | Free, nothing sleeps, database never expires, all in Singapore; Compose gives the same stack on any machine | Long-lived connections (WebSockets) or steady traffic make an always-on server cheaper than functions |

## Project structure

```
apps/
  api/                      Express API
    src/auth/               signup, login, session cookie, /me
    src/rides/              request, accept, arrive, start, drop-off, pay, complete, cancel, history, events
    src/vehicles/           online / offline
    src/areas/              area list
    src/db/migrations/      0001..0012 SQL, one change each
    src/db/seed/cast.sql    Jashim, Bullet, Nusrat, Rafiq, Shirin
    src/db/migrate.js       applies migrations + seed once
    test/                   API tests (need the stack running)
  web/                      Next.js site
    app/(app)/              signed-in pages: dashboard, book, history, fares
    app/login/              sign in / create passenger account
    app/api/                same-origin route handlers that forward to Express
    app/components/         shell, cards, passenger/, driver/
    app/lib/                fetch helper, polling hook, formatting, fare quote
packages/
  domain/                   distance, fare, match + unit tests
docs/                       ERD, architecture and lifecycle diagrams, screenshots
docker-compose.yml          db, api, web with health checks
apps/*/vercel.json          live deploy (Vercel functions)
render.yaml                 earlier Render deploy, kept as an alternative
```

## Run it

**Prerequisites:** Docker Desktop (or Docker Engine + Compose v2). Node 22 only if you run things outside Docker.

```bash
docker compose up --build
```

That is all. The API container runs `migrate.js` (every SQL file once, then the story cast once) before it listens. Open:

- Site: http://localhost:3000
- API health: http://localhost:4000/health
- Postgres: `localhost:5433` (5433 so an existing local Postgres on 5432 does not answer instead)

**Environment variables.** Defaults live in `docker-compose.yml` and match [.env.example](.env.example). To change them, copy it to `.env`; Compose reads it automatically. Nothing secret is committed — `dev-only-change-me` is a placeholder and must be replaced outside a local demo.

| Variable | Used by | Default |
| --- | --- | --- |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | db, api | `tesla` / `tesla` / `tesla_pool` |
| `DB_HOST_PORT` | db port on your machine | `5433` |
| `JWT_SECRET` | api, signs the cookie; the API refuses to start without it | `dev-only-change-me` |
| `SKIP_SEED` | api, `true` creates tables without the cast | `false` |
| `DATABASE_URL` | api when run outside Docker | `postgres://tesla:tesla@localhost:5433/tesla_pool` |
| `API_URL` | web, where Express is | `http://api:4000` in Docker |

**Start over with an empty database:** `docker compose down -v`, then `docker compose up --build`.

**Run without Docker for the apps** (Postgres still from Compose):

```bash
docker compose up -d db
npm install
```

Then, in two terminals (bash syntax; in PowerShell set `$env:NAME="value"` first):

```bash
cd apps/api && DATABASE_URL=postgres://tesla:tesla@localhost:5433/tesla_pool JWT_SECRET=dev-only-change-me npm start
```

```bash
cd apps/web && API_URL=http://localhost:4000 npm run dev
```

## Demo logins

Every password is `pool-demo`. The sign-in page has one-click buttons for the cast. Each wallet starts at 100000 poisha (৳1000).

| Person | Email | Role |
| --- | --- | --- |
| Jashim | jashim@dhaka-tesla.local | driver, Tesla **Bullet**, 3 seats, starts offline |
| Nusrat | nusrat@dhaka-tesla.local | passenger, Banani → Mohakhali |
| Rafiq | rafiq@dhaka-tesla.local | passenger, Banani → Gulshan 1 |
| Shirin | shirin@dhaka-tesla.local | passenger, wants the last seat |

**Try the story:** sign in as Nusrat and book Banani → Mohakhali. In a private window, sign in as Rafiq and book Banani → Gulshan 1, then Shirin and book Banani → Dhanmondi. As Jashim: go online (a pop-up says how many riders are waiting), accept Nusrat, accept Rafiq (both fares drop, and Nusrat is told a rider joined), try Shirin (refused: too far), then arrive, start, drop off. Complete stays locked. As Nusrat, pay with TeslaPay (the wallet drops by ৳74.37); as Rafiq, pay cash. Now Jashim can complete, and everyone gets the "Trip completed" card.

## Tests

With the stack running (`docker compose up`):

```bash
npm test --workspace api
```

Unit tests run anywhere; API tests are skipped if the API is not reachable (`API_URL`, default `http://localhost:4000`). Each API test deletes the rows it created.

| Risk from the brief | Test |
| --- | --- |
| Bullet's capacity can never be exceeded; two concurrent claims cannot corrupt it | [last-seat.test.js](apps/api/test/last-seat.test.js) |
| Invalid state transitions are rejected | [complete-early.test.js](apps/api/test/complete-early.test.js) |
| Nusrat's and Rafiq's fares, solo and pooled | [fares.test.js](packages/domain/fares.test.js), [pool-share.test.js](apps/api/test/pool-share.test.js) |
| The 2 km sharing rule, including a different pickup | [match.test.js](packages/domain/match.test.js) |
| A user cannot see or change another user's ride | [own-ride.test.js](apps/api/test/own-ride.test.js), [pool-share.test.js](apps/api/test/pool-share.test.js) |
| Cancellation rules: not after start; seats and solo fare come back | [cancel-late.test.js](apps/api/test/cancel-late.test.js), [pool-share.test.js](apps/api/test/pool-share.test.js) |
| No paying before drop-off; no completing until every rider has paid | [pay-before-complete.test.js](apps/api/test/pay-before-complete.test.js) |
| An offline Tesla is not shown waiting rides | [waiting-offline.test.js](apps/api/test/waiting-offline.test.js) |

## API overview

All bodies are JSON. Errors are `{ "error": "…" }` with 400 (bad input), 401 (not signed in), 403 (wrong role or not yours), 404, or 409 (rule violated: no seats, wrong status, does not fit). Unknown errors are logged and returned as a plain 500 without a stack.

| Method | Path | Who | What |
| --- | --- | --- | --- |
| GET | `/health` | anyone | `{ ok: true }` for Docker |
| GET | `/areas` | anyone | the Dhaka areas |
| POST | `/signup` | anyone | create a passenger + wallet, sets cookie |
| POST | `/login` | anyone | sets the `token` cookie |
| GET | `/me` | signed in | own account and wallet balance |
| GET | `/users/:id` | self only | own account; anyone else is 403 |
| POST | `/rides` | passenger | request `{ pickupCode, destinationCode, seats }`, returns the solo estimate |
| GET | `/rides/mine` | passenger | own requests with pool size and payment |
| GET | `/rides/history` | both | finished rides (passenger) or pools (driver) |
| POST | `/rides/:id/cancel` | owner | before `started`; returns seats to the pool |
| POST | `/rides/:id/pay` | owner | `{ method: "cash" \| "teslapay" }`, once, after drop-off |
| GET | `/rides/waiting` | driver | all `requested` rides, oldest first; 409 while the Tesla is offline |
| GET | `/rides/:id/matches` | driver | other waiting rides that could share with this one |
| POST | `/rides/:id/accept` | driver | join the open pool or start one; checks online, fit, seats |
| GET | `/pools/open` | driver | the live trip with riders, fares, and who has paid |
| POST | `/pools/:id/arrive` · `/start` · `/drop-off` | driver | next step only |
| POST | `/pools/:id/complete` | driver | after drop-off, once every rider has paid; returns riders and fares collected |
| GET / POST | `/vehicles/online` | driver | read or set `{ online: true \| false }` |
| GET | `/events/mine` | both | latest ride events this person is part of, including another rider joining or leaving their Tesla (without that rider's name or route); drives the feed and pop-ups |

## Deployment

### Live on Vercel + Neon (free plans)

| Piece | Where | URL |
| --- | --- | --- |
| Site (open this) | Vercel project `tesla-pool-web`, Next.js | https://tesla-pool-web-eight.vercel.app |
| API | Vercel project `tesla-pool-api`, Express as a function | https://tesla-pool-api-eight.vercel.app/health |
| Database | Neon Postgres `tesla-pool-db`, added through the Vercel integration | not public |

All three run in **Singapore** (`sin1`), the closest region to Dhaka. The site forwards `/api/*` to the API over HTTPS, so the login cookie stays on the site's own domain.

**Why it moved off Render.** Render's free web services sleep after 15 idle minutes, and this app is two services, so the first visit had to wake both in turn: 30–60 s, and sometimes the site never came up. Its free Postgres also expires after 30 days. On Vercel nothing sleeps (a function starts in well under a second), and Neon's free database does not expire; it pauses when idle and resumes in about half a second.

**How the API runs as a function.** `apps/api/src/server.js` exports the Express app; Vercel serves it as one function, and Docker and local runs still call `app.listen`. Each function instance keeps a pool of at most 3 connections. Migrations and the demo cast run in the API's **build step** (`apps/api/vercel.json`), over Neon's direct (unpooled) URL because the migrator's advisory lock needs one session.

Measured after the move: a story request through the site takes **~190 ms** typical (it was ~1.7 s while the functions sat in the US default region, before both were pinned to Singapore). Checked: the four cast logins, offline driver sees no requests, Nusrat and Rafiq pooled, Shirin refused, arrive → start → drop off, completing refused until Rafiq paid, TeslaPay and cash, complete, and trip history in the browser.

**Deploying a change.** The projects are not connected to GitHub yet (that needs a GitHub login connection on the Vercel account). From the repo root:

```bash
npx vercel link --yes --project tesla-pool-api && npx vercel deploy --prod
```

```bash
npx vercel link --yes --project tesla-pool-web && npx vercel deploy --prod
```

Settings that live in Vercel, not the repo: `JWT_SECRET` and the Neon `DATABASE_URL` / `DATABASE_URL_UNPOOLED` on the API; `API_URL` on the site; function region `sin1` on both.

**Free-plan limits:** Neon free gives 0.5 GB storage and a monthly compute allowance; Vercel Hobby is for non-commercial use.

### Render (earlier, still possible)

[render.yaml](render.yaml) describes the same app on Render's free plan (*New → Blueprint*, then set `API_URL` on the site). Expect the sleep and 30-day database limits above.

### Anywhere with Docker

On any machine or VM with Docker: clone, set a real `JWT_SECRET` in `.env`, `docker compose up -d --build`. Put a reverse proxy with HTTPS in front of port 3000; only the web port needs to be public.

## Assumptions

- **Geography** is a fixed list of eight area centers. Distance is a straight line, not a road route.
- **One driver, one Tesla.** Drivers are seeded with their vehicle; sign-up is for passengers only, because a driver without a Tesla could not accept anything.
- A **request's seats** (1–3) all travel together. A pool is one pickup area, and riders join only before the driver arrives.
- The **estimate is the solo fare**; the shared discount is applied when a second rider actually joins. That way a passenger is never quoted a discount they do not get.
- A passenger may hold **more than one open request** (e.g. booking for a friend on a separate request). One active request per passenger would be a one-line rule if the product wants it.
- **Payment happens at drop-off**, once per rider, and the driver completes the trip only after everyone has paid. Cash is recorded by the passenger tapping "Cash"; a real app would have the driver confirm it. TeslaPay is a simulated wallet debited in the same transaction as the payment row; there is no top-up screen.
- **Polling** (every 3–5 s) instead of WebSockets: enough for a demo with a handful of users.

## Trade-offs, limits, next steps

**Key decision:** the capacity rule lives in the database transaction and constraints, not in application memory or a lock service. It is correct with any number of API processes pointing at one Postgres.

**Trade-off:** the site re-polls instead of pushing updates. Simpler to build and debug; costs a few extra requests and up to a few seconds of delay.

**Known limitations**

- No password reset, email verification, or rate limiting on login.
- The cookie is not marked `Secure`, so it also works on http://localhost. The live site is HTTPS-only; mark it `Secure` in production.
- No driver ratings, no routing or ETA, no live location.
- Straight-line distance can under-charge a detour; the 2 km rule keeps detours small.
- API tests clean up through `docker exec` into the Compose DB container.

**Next improvements**

1. Idempotency keys on accept and pay so a retried request cannot double-apply.
2. Zod (or similar) schemas for every request body.
3. Server-sent events for status changes instead of polling.
4. Rate limiting and account lockout on `/login`.
5. PostGIS points and a real distance matrix instead of area centers.

## Git workflow

- `feature/*` branches for each piece of work: `project-setup`, `schema-seed`, `passenger-auth`, `ride-request`, `tesla-pooling`, `driver-flow`, `passenger-ui`, `driver-ui`, `web-dashboard`, `docker-bootstrap`, `pool-tests`.
- Finished features merge into **`master`**. The later ones are merged with `--no-ff`, so the merge commits show where each feature landed.
- **`pre-release`** is cut from master for integration fixes, docs, and deployment checks.
- **`release/v1.0.0`** is cut from pre-release. It is the version shown in the video.
- Commits follow `<type>(<scope>): <description>`, one logical change each.

## AI usage

**Tools:** Cursor for the first slices (schema, routes, early pages, tests). Claude Code for the dashboard redesign, the Docker bootstrap, the extra tests, and this README.

**How:** one small slice at a time, each ending in a commit that could be reviewed alone. Fare numbers, seat limits, and status jumps were checked by running them (tests, curl, the browser), not by trusting the draft.

**Accepted:** settle the last seat inside one Postgres transaction, with `FOR UPDATE`, a conditional `UPDATE … WHERE seats_taken + n <= capacity`, and a CHECK constraint behind it. No separate lock service.

**Rejected / changed:**

- A matching rule that shared a ride whenever the second drop-off was "only a little farther" than the first. It would have paired Banani → Dhanmondi with Banani → Mohakhali because Mohakhali is roughly on the way, even though the two drop-offs are about 4 km apart. Replaced by "same pickup and drop-offs within 2 km".
- A drafted subquery counted pool riders using a Drizzle column inside raw SQL. Drizzle printed the column without its table, so the subquery compared `pool_members` with itself and every trip showed 0 riders. Caught in the browser, fixed by naming `pools.id` and `ride_requests.pool_id` explicitly (commit `fix(ride): count the riders of each row's own pool`).
- A decorative fare chart copied from the design reference was removed; the theme was wanted, not every widget.

## If Oi Tesla goes viral

Target: 1M passengers, 100k drivers. Today: one Postgres, one API process, polling. What changes, in the order it would hurt:

- **Stateless API behind a load balancer.** The API already keeps no session in memory (JWT cookie), so it scales horizontally. Next.js likewise.
- **DB contention on accept.** Row locks on hot pools serialize accepts. Partition the work by zone: a queue (or a single worker) per pickup zone assigns seats, so accepts for Banani never wait on Mirpur. Keep the conditional update as the final guard.
- **Idempotency.** Accept and pay take an idempotency key stored with a unique index, so a client retry after a timeout does not take a second seat or charge twice.
- **Geospatial search.** Replace area centers with PostGIS points and a GiST index; match by "pickup within N m and heading compatible", not by area code.
- **Indexes and replicas.** Index `ride_requests (status, pickup_code, created_at)` for the waiting board. Serve history and the activity feed from read replicas; keep writes on the primary.
- **Real-time.** Server-sent events or WebSockets through a pub/sub layer (Postgres `LISTEN/NOTIFY` first, Redis when fan-out grows) instead of every client polling.
- **Caching.** Areas, fare constants, and driver profile are read-mostly and can be cached; seat counts must not be.
- **Rate limiting** on login, booking, and accept per user and IP at the load balancer.
- **Events.** `ride_events` becomes the source for an event stream (outbox pattern) feeding notifications, analytics, and fraud checks, without slowing the accept transaction.
- **Failure and retries.** Timeouts plus retries with backoff on the client; accept/pay are safe to retry because of idempotency keys; stuck pools are swept by a job.
- **Observability.** Structured JSON logs with request ids (the API already logs one line per request), metrics on accept latency and 409 rates, tracing across web → API → DB.
- **Security.** Secrets in a secret manager, `Secure` cookies, CSRF token on state-changing routes, audit of admin actions.
- **Deployment.** Containers already exist; move to a managed platform with rolling deploys, migrations run once per release, and a staging copy of `pre-release`.

None of this is built. It is where the current design bends first.

## Video outline

Six minutes maximum.

- **0:00–1:00** The problem in my own words: Nusrat and Rafiq leave Banani two minutes apart. Bullet has three seats. Share when it makes sense, charge each fairly, never overbook.
- **1:00–3:00** Architecture diagram and ERD. The two lifecycles (request vs pool). One decision: the capacity rule lives in the database transaction. One trade-off: polling instead of push.
- **3:00–6:00** Product tour: Nusrat books, Rafiq books, Jashim goes online and accepts both (fares drop to ৳74.37 and ৳72.25), Shirin is refused, arrive → start → drop off, Complete stays locked until Nusrat (TeslaPay) and Rafiq (cash) pay, then the "Trip completed" card. Edge case: two accepts for the last seat (run `last-seat.test.js`).
