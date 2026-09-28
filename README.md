# Dhaka Tesla Pool

Passengers request a seat. Jashim can pool them in Bullet when the pickup matches and the drop-offs are within 2 km.

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
