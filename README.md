# Dhaka Tesla Pool

Passengers request a seat. Jashim can pool them in Bullet when the pickup matches and the drop-offs are within 2 km.

## Architecture

The browser talks only to the Next.js app in `apps/web`. Those pages collect sign-in and ride actions. They copy the login cookie and forward the call to Express, so the token stays on the site.

Express in `apps/api` owns accounts, the trip, seat counts, and payment. Postgres stores the rows. Taking a seat runs in one transaction: the pool row is locked, and the update is kept only when `seats_taken` still fits Bullet’s capacity.

The rules in `packages/domain` do not touch the database.

- Distance is the straight line between two area centers, rounded to the nearest meter.
- Fare, in poisha, is 4000 plus 250 for every 100 meters billed. A shared ride subtracts 15 percent, rounded half-up.
- Two requests share a Tesla only when the pickup area is the same and the destinations are at most 2 km apart.

Jashim accepts a waiting ride (`matched`), marks arrival (`driver_arrived`), starts it (`started`), then completes it. A passenger can cancel until it starts. After completion they pay cash, or TeslaPay debits their wallet.

## Data model

The tables are drawn in [docs/erd/erd.svg](docs/erd/erd.svg). The source is [docs/erd/erd.mmd](docs/erd/erd.mmd). Users, vehicles, and areas come first. A ride request can join one pool. Pool members, the append-only ride events, wallets, and payments hang off those rows.

## Run

Start the database, then load the tables and the demo cast through that database. Do not use another Postgres that happens to be on port 5432.

```powershell
docker compose up -d db
Get-ChildItem apps/api/src/db/migrations/*.sql | Sort-Object Name | ForEach-Object {
  Get-Content $_ -Raw | docker compose exec -T db psql -U tesla -d tesla_pool
}
Get-Content apps/api/src/db/seed/cast.sql -Raw | docker compose exec -T db psql -U tesla -d tesla_pool
docker compose up -d --build
```

Open http://localhost:3000. The API health check is http://localhost:4000/health.

## Demo logins

Every password is `pool-demo`. Money is integer poisha (100 poisha = 1 BDT). Each wallet starts at 100000 poisha.

| Person | Email | Role |
| --- | --- | --- |
| Jashim | jashim@dhaka-tesla.local | driver, Tesla Bullet, 3 seats, starts offline |
| Nusrat | nusrat@dhaka-tesla.local | passenger |
| Rafiq | rafiq@dhaka-tesla.local | passenger |
| Shirin | shirin@dhaka-tesla.local | passenger |

## Tests

From `apps/api`, with the API on port 4000:

```powershell
$env:API_URL="http://localhost:4000"
npm test
```

The fare check runs without the API. The ride checks are skipped when the API is down.

## AI usage

Cursor was used to draft the schema, routes, pages, and tests, one small slice at a time, so each commit stays reviewable. The fare numbers, seat limit, and status jumps were checked by running them, not by accepting the draft.

Accepted: the last seat is settled inside one Postgres transaction. The update is kept only when `seats_taken` plus the new seats still fits Bullet’s capacity. A separate lock service was not added.

Rejected: matching by whether the second drop-off is only a little farther than the farthest stop. That would have paired Banani to Dhanmondi with Banani to Mohakhali, because Mohakhali sits nearly on the way. Those destinations are about 4 km apart, so they do not share. Sharing requires the same pickup and a destination-to-destination gap of at most 2 km.

## If this served a much larger city

This demo has one Postgres and one API process. The last seat is safe because one transaction locks the pool row and updates it only when the new seats still fit. Two requests that arrive together cannot both commit. That is enough for Bullet. It is not a design for a million passengers.

At that size, accept calls would pile onto a few popular pool rows, so the database would spend time waiting on those locks. Waiting requests would be indexed by pickup area instead of loaded and filtered in the process. Reads such as history could use a replica. New accept attempts could wait on a queue per zone, retry when the lock is busy, and be idempotent so a retried request does not take a second seat. Real map search would replace the fixed area centers. None of that is built here.


