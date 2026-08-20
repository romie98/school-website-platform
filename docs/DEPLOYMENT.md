# Deployment smoke test

Run after every staging or production deploy. Do not skip because the homepage loaded.

## Before migrate

1. Confirm a backup exists for this environment (Super Admin → System, or provider snapshot).
2. Apply migrations: `python -m alembic upgrade head`
3. Do not automatically restore if a migration fails. Inspect, then decide.

## After deploy

Check in order:

1. Public frontend loads for a known tenant domain.
2. `GET /api/health` returns `{ "status": "healthy" }`.
3. `GET /api/health/ready` shows database and storage healthy (not 503).
4. Super Admin → System: API, database, storage, backup are not UNHEALTHY.
5. Super Admin can sign in at `/admin/login`.
6. A school admin can sign in and open the CMS.
7. A tenant public site loads news/events.
8. Upload a small test image; it should succeed.
9. No spike in 500s or failed uploads on System → Recent errors.

If database is down, ready will be **unhealthy**. If only storage is down, ready will be **degraded** and uploads should fail with a friendly message.

## Rollback

If the deploy is bad:

1. Keep the previous backup; do not run restore blindly.
2. Roll back the application release first when the database schema is compatible.
3. Restore the database only when the schema or data is corrupted (see `docs/RESTORE.md`).
