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
| `APP_ENV` | `production` |
| `APP_DEBUG` | `false` |
| `APP_KEY` | Run `php artisan key:generate --show` locally and paste |
| `APP_URL` | `https://your-service.onrender.com` (your Render URL) |
| `DB_CONNECTION` | `pgsql` |
| `DB_HOST` | Your Neon host (e.g. `ep-bold-morning-aiy9w3d0-pooler.c-4.us-east-1.aws.neon.tech`) |
| `DB_PORT` | `5432` |
| `DB_DATABASE` | Your Neon database name |
| `DB_USERNAME` | Your Neon username |
| `DB_PASSWORD` | Your Neon password |
| `DB_SSLMODE` | `require` |
| `SESSION_DRIVER` | `database` |
| `SANCTUM_STATEFUL_DOMAINS` | `construction-managment-erp.vercel.app` |
| `CORS_ALLOWED_ORIGINS` | `https://construction-managment-erp.vercel.app` |

## After First Deploy

1. Copy your Render service URL (e.g. `https://project-prism-api.onrender.com`).
2. In **Vercel** → Project → Settings → Environment Variables:
   - Add `VITE_API_URL` = your Render URL (e.g. `https://project-prism-api.onrender.com`)
3. Redeploy the frontend so it picks up the new API URL.

## Notes

- **Cold starts**: On the free tier, the service sleeps after 15 minutes of inactivity. The first request may take 30–60 seconds.
- **Ephemeral storage**: File uploads in `storage/` are not persisted across deploys. Use S3 or similar for persistent uploads if needed.
