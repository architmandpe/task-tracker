# Task Tracker

A multiuser task tracker with an AI assistant built in — create, update, and query your tasks in plain English, on top of a normal CRUD task app.

**Live app:** https://task-tracker-vwrp.onrender.com

## Architecture

Two services:

```
Browser ──cookie──▶ task-tracker (FastAPI + Postgres)   ← this repo
                          │ X-Internal-Secret
                          ▼
                     copilot (FastAPI + pgvector Postgres)
```

`task-tracker` owns users, tasks, and auth (JWT in an httpOnly cookie), and serves the React frontend. It has no LLM logic of its own — every assistant request is forwarded to the sibling [copilot](https://github.com/architmandpe/Copilot) service over a shared internal secret. copilot does the actual reasoning (a LangGraph agent, RAG search, task parsing) and calls back into task-tracker's internal API to read/write tasks on the user's behalf.

## Features

- Task CRUD — title, status, priority, due date, recurrence
- Conversational assistant — create, update, delete (with confirmation), bulk-edit, and decompose tasks, or just ask questions like "what's overdue?", all in plain English, streamed via SSE
- Semantic search over your tasks
- Activity log of every action the assistant took on your behalf
- Command palette and a keyboard-first task list

## Tech stack

**Backend:** FastAPI, SQLAlchemy, Alembic, Postgres
**Frontend:** React (Vite)

## Local development

See [RUNBOOK.md](RUNBOOK.md) — covers this repo, the sibling `copilot` repo, and the Postgres containers both need.

## Testing

```
uv run pytest
```

14 tests. Run automatically in CI on every push to `main`; a deploy only fires if they all pass (see below).

## Deployment

Hosted on Render (API) + Neon (Postgres). [`.github/workflows/test-and-deploy.yml`](.github/workflows/test-and-deploy.yml) runs migrations and the full test suite against a fresh, throwaway Postgres on every push to `main`, and only triggers Render's deploy hook if everything passes — a broken push never reaches production.
