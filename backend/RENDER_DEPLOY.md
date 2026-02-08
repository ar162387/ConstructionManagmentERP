# Deploying Laravel Backend to Render

This guide explains how to deploy the ProjectFlow ERP backend to Render using Docker.

## Prerequisites

- Render account
- GitHub repo with this codebase
- Neon PostgreSQL database (already set up)
- Vercel frontend (already deployed at https://construction-managment-erp.vercel.app)

## Render Dashboard Setup

1. Create a new **Web Service** on Render (dashboard.render.com).
2. Connect your GitHub repository.
3. Configure the service:
   - **Root Directory**: `backend`
   - **Runtime**: Docker
   - **Dockerfile Path**: `Dockerfile` (relative to Root Directory)

## Environment Variables

Add these in Render → Your Service → Environment:

| Variable | Value |
|----------|-------|
| `AUTORUN_ENABLED` | `true` (enables Laravel automations: config:cache, migrate, etc.) |
| `NGINX_HTTP_PORT` | `10000` (Render's default; set via Dockerfile if not overridden) |
| `APP_ENV` | `production` |
| `APP_DEBUG` | `false` |
| `APP_KEY` | Run `php artisan key:generate --show` locally and paste |
| `APP_URL` | Optional – Render sets `RENDER_EXTERNAL_URL` automatically |
| `DB_CONNECTION` | `pgsql` |
| `DB_HOST` | Your Neon host (e.g. `ep-bold-morning-aiy9w3d0-pooler.c-4.us-east-1.aws.neon.tech`) |
| `DB_PORT` | `5432` |
| `DB_DATABASE` | Your Neon database name |
| `DB_USERNAME` | Your Neon username |
| `DB_PASSWORD` | Your Neon password |
| `DB_SSLMODE` | `require` |
| `SESSION_DRIVER` | `database` |
| `PHP_OPCACHE_ENABLE` | `1` (recommended – speeds up PHP) |
| `SANCTUM_STATEFUL_DOMAINS` | `construction-managment-erp.vercel.app` |
| `CORS_ALLOWED_ORIGINS` | `https://construction-managment-erp.vercel.app` |

## After First Deploy

1. Copy your Render service URL (e.g. `https://project-prism-api.onrender.com`).
2. In **Vercel** → Project → Settings → Environment Variables:
   - Add `VITE_API_URL` = your Render URL (e.g. `https://project-prism-api.onrender.com`)
3. Redeploy the frontend so it picks up the new API URL.

## Connect frontend (go live)

When the backend is live (e.g. **https://constructionmanagmenterp.onrender.com**), wire the frontend and backend as follows.

### 1. Backend (Render) – environment variables

In **Render** → your service → **Environment**:

| Variable | Value | Required |
|----------|--------|----------|
| `APP_URL` | `https://constructionmanagmenterp.onrender.com` | Recommended (or leave unset; Render sets `RENDER_EXTERNAL_URL`) |
| `CORS_ALLOWED_ORIGINS` | `https://construction-managment-erp.vercel.app` | Yes – frontend origin (or your real Vercel URL) |
| `SANCTUM_STATEFUL_DOMAINS` | `construction-managment-erp.vercel.app` | Yes – same as above, no `https://` |
| `APP_KEY` | From `php artisan key:generate --show` | Yes |
| DB_* | Neon credentials | Yes |

Save and let the service redeploy if needed.

### 2. Frontend (Vercel) – API URL

In **Vercel** → your project → **Settings** → **Environment Variables**:

| Name | Value | Environment |
|------|--------|-------------|
| `VITE_API_URL` | `https://constructionmanagmenterp.onrender.com` | Production (and Preview if you use preview deploys) |

No trailing slash. Then **redeploy** the frontend (Deployments → … → Redeploy) so the new value is baked in.

### 3. Verify

- Open the frontend (e.g. https://construction-managment-erp.vercel.app).
- Log in; the app should call `https://constructionmanagmenterp.onrender.com/api/...`.
- If the backend was sleeping, the first request may take 30–60 s (cold start).

## Performance (making it faster)

The backend can feel slow because of (1) cold starts on the free tier, (2) no PHP OPcache, and (3) cache/session hitting the database every request. Apply these in order:

### 1. Enable PHP OPcache (do this first)

In **Render** → your service → **Environment**, add:

| Variable | Value |
|----------|--------|
| `PHP_OPCACHE_ENABLE` | `1` |

Redeploy. This caches compiled PHP and often gives a big improvement.

### 2. Use Neon’s connection pooler

In Neon, use the **pooler** host for `DB_HOST` (e.g. `ep-xxx-pooler.xxx.neon.tech`), not the direct connection host. Pooler reduces connection overhead and can improve response times.

### 3. Reduce database round-trips (optional)

Right now cache and sessions use the database (`CACHE_STORE=database`, `SESSION_DRIVER=database`), so every request does extra DB reads. For a single instance you can switch to file (faster, but sessions/cache are wiped on deploy):

| Variable | Value |
|----------|--------|
| `CACHE_STORE` | `file` |
| `SESSION_DRIVER` | `file` |

Trade-off: users get logged out on each deploy. If that’s acceptable, this speeds up requests.

### 4. Cold starts (free tier)

On the free tier the service sleeps after ~15 minutes of inactivity. The first request after that can take **30–60 seconds**. Options:

- **Upgrade to Render Starter** – service stays awake, no sleep.
- **Keep-alive ping** – use a free cron (e.g. cron-job.org) to `GET https://constructionmanagmenterp.onrender.com` every 14 minutes. Keeps the instance warm during active use.

## Notes

- **Startup flow**: The image uses serversideup **AUTORUN** and **entrypoint.d** scripts. On each deploy:
  1. `entrypoint.d/05-env-setup.sh` ensures `.env` exists (copies from `.env.example` if missing).
  2. AUTORUN runs Laravel automations: `config:cache`, `route:cache`, `migrate`, `optimize`, `storage:link`, `view:cache`, `event:cache`.
  3. Nginx and PHP-FPM start via s6 overlay.
- **PHP 8.4**: The Dockerfile uses `serversideup/php:8.4-fpm-nginx` to match your Laravel/composer.lock requirements.
- **Port**: The image listens on port 10000 (Render’s default). No extra config needed.
- **Manual deploy script**: `scripts/00-deploy.sh` is kept for local/manual use (e.g. `docker exec` into a running container). Render deployments use AUTORUN instead.
- **Cold starts**: On the free tier, the service sleeps after 15 minutes of inactivity. The first request may take 30–60 seconds.
- **Ephemeral storage**: File uploads in `storage/` are not persisted across deploys. Use S3 or similar for persistent uploads if needed.
