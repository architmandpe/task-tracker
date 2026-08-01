# Deploy

> **Not how the live app is actually deployed.** The real deployment is Render (API) + Neon (Postgres), gated by the CI workflow in `.github/workflows/test-and-deploy.yml` — see the root `README.md`. This doc describes a self-hosted alternative (a single VM you control) that was built and tested but isn't in use; kept here in case that path is ever needed again.

How to put task-tracker + copilot on the public internet, for free, on a single VM. For local development, see `RUNBOOK.md` instead - this doc is production only.

## Shape of the deployment

One VM runs everything via Docker Compose: task-tracker's Postgres, copilot's pgvector Postgres, copilot itself, task-tracker's API (which now also serves the built React frontend, same-origin - see `app/main.py`), and Caddy as the reverse proxy/TLS terminator. Only Caddy is reachable from the internet (ports 80/443). Everything else - both databases, copilot, and task-tracker's own port 8000 - stays on the private Docker network, reachable only by other containers. copilot in particular never needs a public port: it's only ever called server-to-server by task-tracker, gated by `INTERNAL_SECRET`.

## Prerequisites

- An [Oracle Cloud](https://www.oracle.com/cloud/free/) account, with an Always Free Ampere A1 (ARM) VM running Ubuntu, publicly reachable.
- A free domain from [DuckDNS](https://www.duckdns.org/) (or any domain you own), with an A record pointing at the VM's public IP.
- **Open ports 80 and 443** in the VM's security rules. Oracle's default security list blocks both - Caddy will never be reachable until you open them. (In the OCI console: your instance's subnet -> Security Lists -> Ingress Rules -> add rules for `0.0.0.0/0`, TCP, destination ports 80 and 443.)
- The same API keys `RUNBOOK.md` lists for local dev: a Groq key and a Google AI Studio (Gemini) key.

## 1. Server setup

SSH into the VM, then install Docker:

```
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

Log out and back in for the group change to take effect (or run `newgrp docker`).

## 2. Clone both repos as siblings

Same layout `RUNBOOK.md` describes for local dev - `copilot` must sit next to `task-tracker` (`docker-compose.prod.yml` builds copilot via `../copilot`):

```
git clone https://github.com/architmandpe/task-tracker.git
git clone <your-copilot-repo-url> copilot
```

## 3. Configure production secrets

In `task-tracker/`:

```
cp .env.prod.example .env.prod
```

Edit `.env.prod` and fill in:
- `DOMAIN` - your DuckDNS (or other) domain
- `JWT_SECRET` / `INTERNAL_SECRET` - generate fresh random values, don't reuse your local dev secrets (e.g. `openssl rand -hex 32`)
- `TRACKER_POSTGRES_PASSWORD` / `COPILOT_POSTGRES_PASSWORD` - any values, these are just passwords for the two self-hosted Postgres containers
- `GROQ_API_KEY` / `GEMINI_API_KEY` - same keys you use locally
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` - optional, for Google sign-in. Leave blank to keep the app on email and password only.

This one file holds every secret both services need - `docker-compose.prod.yml` passes the relevant ones through to each container explicitly.

### Google sign-in in production

Two things differ from local:

- Add `https://$DOMAIN/auth/google/callback` to the **Authorized redirect URIs** of the same OAuth client (an OAuth client can hold several, so one client covers both local and prod).
- `GOOGLE_REDIRECT_URI` **must** be set here. Locally the app derives the callback URL from the incoming request; behind Caddy the request it sees is plain `http://` on an internal hostname, so it can't infer the public `https://` origin and would hand Google a redirect URI that doesn't match what you registered.

Until the OAuth consent screen is **published**, only accounts listed under **Test users** can sign in. Google requires verification before a public consent screen can request more than the basic scopes; `openid email profile` is basic, so publishing is straightforward.

## 4. Build and start everything

Back in `task-tracker/`:

```
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

This builds task-tracker's image (which includes building the React frontend as part of the image - see the multi-stage `Dockerfile`), builds copilot's image, and starts all five containers (`db`, `copilot-db`, `copilot`, `api`, `caddy`). Caddy will automatically request a real HTTPS certificate for `DOMAIN` from Let's Encrypt the first time it starts - this requires ports 80/443 to already be reachable from the internet (step in Prerequisites).

Check everything came up:

```
docker compose --env-file .env.prod -f docker-compose.prod.yml ps
```

## 5. Run migrations

```
docker compose --env-file .env.prod -f docker-compose.prod.yml exec api uv run alembic upgrade head
```

## 6. Verify it's live

From your own machine (not the VM), over the real internet:

```
curl https://your-app.duckdns.org/health
```

Should return `{"status":"ok"}` with a valid HTTPS response (no cert warnings). Then open `https://your-app.duckdns.org` in a browser - you should see the login screen, served from the same domain that also serves the API, exactly like `localhost:5173` proxying to `localhost:8000` does in dev. Sign up, create a task, and talk to the assistant to confirm the full stack (frontend -> task-tracker -> copilot -> both databases) works end-to-end.

## Redeploying after a change

No CI/CD yet - manual redeploy:

```
git pull
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

Run in `task-tracker/` (and `git pull` in `copilot/` too if that repo changed). If a new migration was added, re-run step 5.

## Tear down

```
docker compose --env-file .env.prod -f docker-compose.prod.yml down
```

Add `-v` to also delete both Postgres data volumes and Caddy's cert cache.
