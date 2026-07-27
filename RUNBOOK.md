# Runbook

How to go from a fresh clone to a fully running system: task-tracker (API), copilot (LLM agent service), and the React frontend.

## Prerequisites

- [uv](https://docs.astral.sh/uv/) installed
- [Docker](https://www.docker.com/) installed and running (Docker Desktop on Mac)
- [Node.js](https://nodejs.org/) + npm installed (for the frontend)
- API keys: a [Groq](https://console.groq.com/) key (chat) and a [Google AI Studio](https://aistudio.google.com/) key (embeddings) — both needed by `copilot`

This repo (`task-tracker`) and the sibling `copilot` repo must be cloned as siblings (e.g. both under the same parent directory) — `copilot` is a separate `uv` project with its own environment.

## 1. task-tracker setup

```
cp .env.example .env
```

Edit `.env` and set a real `JWT_SECRET` (any long random string) and `INTERNAL_SECRET` (must match the same value in `copilot/.env` — this is the shared secret the two services use to trust each other).

## 2. copilot setup

In the sibling `copilot/` directory:

```
cp .env.example .env
```

Fill in `GROQ_API_KEY`, `GEMINI_API_KEY`, `POSTGRES_PASSWORD` (any value, it's copilot's own local Postgres), and `INTERNAL_SECRET` (same value as task-tracker's).

## 3. Build and start task-tracker

Back in `task-tracker/`:

```
docker compose up --build
```

Builds the API image and starts both services (`api` + `db`). Wait until you see `db-1` report healthy and `api-1` log `Application startup complete`.

## 4. Run task-tracker's migrations

In a second terminal, once the stack above is running:

```
docker compose exec api uv run alembic upgrade head
```

Applies all pending Alembic migrations against the Postgres container.

## 5. Start copilot's Postgres and server

In `copilot/`:

```
docker compose up -d
uv run uvicorn main:app --reload --port 8001
```

The first command starts copilot's own pgvector Postgres (port 5433, separate from task-tracker's). The second runs copilot natively on the host (not containerized) so it can reach task-tracker at `http://localhost:8000` and be reached back at `http://host.docker.internal:8001` from inside task-tracker's container.

## 6. Start the frontend

In `task-tracker/frontend/`:

```
npm install
npm run dev
```

Starts the Vite dev server on `http://localhost:5173`. It proxies `/auth`, `/tasks`, and `/assistant` requests to task-tracker on port 8000 (see `vite.config.js`), so the browser sees everything as same-origin — required for the `httpOnly` auth cookie to work.

**Note:** task-tracker also has a legacy static mount at `http://localhost:8000/app` (`static/index.html`) — this is the original plain-HTML frontend from before the React rewrite and is no longer the real UI. The Vite dev server (`:5173`) is the actual frontend now. There's no production build step wired up yet (`npm run build` → copy `dist/` into `static/`) — this only runs in dev mode via `npm run dev`.

## Verify it's up

```
curl localhost:8000/health
```

Should return `{"status":"ok"}`. Then open `http://localhost:5173` in a browser — you should see the login screen.

## Run tests

task-tracker tests run from the host, against the same Postgres container (its port is exposed for this purpose):

```
export DATABASE_URL="postgresql+psycopg://tracker:tracker@localhost:5432/tracker"
export JWT_SECRET="dev-secret-not-for-prod"
export INTERNAL_SECRET="dev-secret-not-for-prod"
uv run pytest
```

copilot tests run from within `copilot/` (uses its own `.env`, loaded automatically):

```
cd copilot
uv run pytest
uv run python eval.py   # agent behavior eval suite, separate from pytest
```

## Tear down

```
docker compose down
```

Run in both `task-tracker/` and `copilot/` to stop their respective containers. Add `-v` (`docker compose down -v`) to also delete the Postgres data volumes and start completely fresh next time.
