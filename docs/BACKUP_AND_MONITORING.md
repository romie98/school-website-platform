# Backup and Monitoring

Practical V1 for the multi-tenant school website platform. This is not a full observability product. It is enough to move toward staging and a small pilot.

## What is protected

- Database (all tenants)
- Uploaded media and documents (logos, news images, staff photos, gallery, documents)
- Application health (API, database, storage, backups)

A database-only backup is not sufficient. Restore both the database and media together.

## Environments

Backups and monitoring are scoped by `ENVIRONMENT`:

| Value | Behaviour |
| --- | --- |
| `development` / `test` | Verbose logs, local file backups, no production alerts |
| `staging` | Real health checks, local or provider backups, optional test webhook |
| `production` | JSON logs, provider-managed database backups preferred, production alerts |

Never restore a staging backup into production, or the reverse.

Local `dev.db` is not production data.

## Database backups

### Local / SQLite (current development)

From `backend/`:

```powershell
python -m app.ops backup
```

This copies:

- the SQLite database file
- `STORAGE_DIR` (media)
- recoverable trash (`MEDIA_TRASH_DIR`)

into `BACKUP_DIR/<environment>/<timestamp>/`.

Metadata is stored in `backup_runs` (`RUNNING` / `SUCCESS` / `FAILED`). Failures are visible on **Platform → System** and as `BACKUP_FAILED` system events.

### Staging / production PostgreSQL

Do not build a custom backup engine if the database provider already offers automated backups (for example Railway, Render, RDS, Neon, Supabase).

Set:

```
BACKUP_MODE=provider
```

Then keep using `python -m app.ops backup` as an application checkpoint that still copies media and records backup status. Enable the provider's native database backups separately:

- Daily backups
- Point-in-time restore if offered
- Retention aligned with the policy below

If you self-host Postgres, use `pg_dump` on a schedule and store the dump next to the media copy. Do not put credentials in this repository.

## Media / file storage

Uploads currently live on the local filesystem:

```
STORAGE_DIR/schools/<school_id>/<kind>/<filename>
```

This is **unsafe for production** unless the host provides persistent volumes. For staging/production prefer object storage (S3-compatible) with:

- Object versioning
- Soft delete / retain deleted objects
- Bucket-level backup or replication

Application deletes move files into `MEDIA_TRASH_DIR` instead of permanently destroying them immediately.

## Retention (configurable)

Defaults, overridable in environment:

```
BACKUP_RETENTION_DAILY_DAYS=14
BACKUP_RETENTION_WEEKLY_WEEKS=4
BACKUP_RETENTION_MONTHLY_MONTHS=3
BACKUP_OVERDUE_HOURS=26
```

Sunday backups are kept as weekly points. First-of-month backups are kept as monthly points.

## Backup health

- **HEALTHY** — last successful backup within `BACKUP_OVERDUE_HOURS`
- **DEGRADED** — last success is overdue (`WARNING` / Backup overdue)
- **UNHEALTHY** — last attempt failed, or none exist outside development (`CRITICAL`)
- **UNKNOWN** — no backup yet in development/test

Failed backups must never fail silently.

## Monitoring

### Public probes (safe for uptime services)

- `GET /api/health` — process is up. Minimal JSON: `{ "status": "healthy" }`
- `GET /api/health/ready` — database `SELECT 1` and storage probe. No hosts, credentials, or paths.

Recommended external checks:

- Public frontend URL
- `GET /api/health`
- `GET /api/health/ready`

### Super Admin

`/platform/system` shows service states, last backup, errors today, failed uploads, and recent sanitized errors.

School users cannot see this page or `/api/platform/system*`.

### What is recorded

Significant events only (`system_events`), not every health probe:

- Unhandled 500s
- Upload / storage failures
- Approval publish failures
- Audit write failures
- Backup start / success / failure / overdue
- Repeated failed sign-ins (security warning, not an outage)

Content audit logs remain separate. They record who changed school content.

### Request IDs

Every API response includes `X-Request-ID`. Use it when matching Super Admin errors to server logs.

### Alerts

School users never receive infrastructure alerts.

Optional Super Admin webhook:

```
OPS_ALERT_WEBHOOK=
```

If empty, critical events are logged only. Connect email/Slack later without changing the event model.

Optional error reporting:

```
SENTRY_DSN=
```

Leave empty in development. Do not send local errors into the production Sentry project.

## Secrets

Keep these in environment / secret storage, never in Git:

- `DATABASE_URL`
- `SECRET_KEY`
- storage credentials
- `SENTRY_DSN`
- `OPS_ALERT_WEBHOOK`
- SMTP credentials

Monitoring metadata is sanitized and must not include passwords, tokens, or database URLs.
