# Runbook

How to go from a fresh clone to a running system.

## Prerequisites

- [uv](https://docs.astral.sh/uv/) installed
- [Docker](https://www.docker.com/) installed and running (Docker Desktop on Mac)

## Setup

```
cp .env.example .env
```

Edit `.env` and set a real `JWT_SECRET` (any long random string is fine for local dev).

## Build

```
docker compose up --build
```

Builds the API image and starts both services (`api` + `db`). Wait until you see `db-1` report healthy and `api-1` log `Application startup complete`.

## Run migrations

In a second terminal, once the stack above is running:

```
docker compose exec api uv run alembic upgrade head
```

Applies all pending Alembic migrations against the Postgres container.

## Verify it's up

```
curl localhost:8000/health
```

Should return `{"status":"ok"}`. The frontend is at `http://localhost:8000/app`.

## Run tests

Tests run from the host, against the same Postgres container (its port is exposed for this purpose):

```
export DATABASE_URL="postgresql+psycopg://tracker:tracker@localhost:5432/tracker"
export JWT_SECRET="dev-secret-not-for-prod"
uv run pytest
```

## Tear down

```
docker compose down
```

Add `-v` (`docker compose down -v`) to also delete the Postgres data volume and start completely fresh next time.
