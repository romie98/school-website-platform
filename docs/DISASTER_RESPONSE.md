# Disaster response (short)

These are operator steps. Do not expose internals to school users. Use Super Admin → System and `X-Request-ID` to see which tenant is affected.

## Database accidentally deleted or corrupted

1. Confirm `/api/health/ready` (database unhealthy).
2. Do not keep writing traffic if possible.
3. Restore the latest **same-environment** backup (`docs/RESTORE.md`).
4. Verify two tenants and authentication.
5. Record the incident time and backup id.

## Bad migration

1. Stop rolling forward.
2. Confirm a pre-migration backup exists.
3. Fix forward if the migration is easily reversible and data is intact.
4. Otherwise restore the pre-migration backup, then ship a corrected migration.
5. Never auto-restore without review.

## Storage file deletion or outage

1. Existing text content may still load.
2. Uploads should show: `Unable to upload image. Please try again.`
3. Restore media from the backup `media/` folder or object-storage versions.
4. Application trash is in `MEDIA_TRASH_DIR` (local V1).

## Backend deployment failure

1. Roll back the previous API release.
2. Confirm `/api/health` and `/api/health/ready`.
3. Confirm admin login.

## Frontend deployment failure

1. Roll back the previous frontend release.
2. Confirm the public site and `/admin/login`.
3. API health can still be green if only the SPA failed.

## Credential leak

1. Rotate `SECRET_KEY`, database password, storage keys, SMTP, and monitoring DSNs.
2. Invalidate sessions by rotating `SECRET_KEY` (users must sign in again).
3. Confirm secrets are not in Git.
4. Restore only if data may have been changed; rotation is usually enough.

## Backup failure

1. Super Admin → System will show backup **UNHEALTHY**.
2. Inspect `backup_runs.error_message` (sanitized) and server logs.
3. Fix storage path, disk space, or provider credentials.
4. Run `python -m app.ops backup` and confirm SUCCESS before the next change window.

## API or database down

Users should see a generic unavailable message, not SQL or connection strings. Super Admin health should show Database UNHEALTHY and API DEGRADED.
