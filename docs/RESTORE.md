# Restore procedure (staging)

Full-database restore only. Do not restore one school's rows into another tenant. A backup contains every tenant; restoration must keep `school_id` relationships intact.

Never restore a backup from a different `ENVIRONMENT`.

## 1. Identify the backup

- Super Admin → **System** → last successful backup time
- Or the folder `backend/backups/<environment>/<timestamp>/`
- Confirm `MANIFEST.json` exists and `database.db` + `media/` are present
- Confirm the environment name matches staging

If using a Postgres provider, identify the provider snapshot / PITR timestamp instead of `database.db`.

## 2. Staging recovery drill

1. Create or use a test school (keep a second school unchanged as the isolation check).
2. Add news, events, staff, an image, settings, an approval, and an audit event.
3. Run `python -m app.ops backup` (or note the provider snapshot).
4. Record the backup timestamp.
5. Modify or delete the test school's content and a media file.
6. Restore (below).
7. Verify.

## 3. Restore (SQLite / local staging)

Stop the API process so the database file is not locked.

From `backend/`:

```powershell
python -m app.ops restore --path ".\backups\staging\YYYYMMDD-HHMMSS"
```

This replaces:

- the SQLite database file
- `STORAGE_DIR` from the backup `media/` folder

Then start the API and run `python -m alembic upgrade head` only if the restored schema is behind the code. Do not auto-restore on a failed migration.

## 4. Restore (provider Postgres)

1. Snapshot / restore the database using the provider console or CLI.
2. Restore media from the application backup folder or the object-storage version history.
3. Confirm `ENVIRONMENT=staging` before starting the app.
4. Rotate credentials if the restore was needed because of a leak (see disaster guide).

## 5. Verify restore success

- Test school still exists with the original slug
- Second school is unchanged (no cross-tenant mixing)
- School admin and principal can sign in
- News, events, staff, and settings match the backup
- Approval history and audit events are present
- Media URLs load; files exist under `schools/<school_id>/`
- Public site for school A does not show school B content
- `GET /api/health/ready` returns healthy

## 6. Production restore

Treat production restore as an operator-reviewed incident:

1. Confirm a current production backup exists.
2. Put the site in maintenance if possible.
3. Restore database and media from **production** backups only.
4. Verify health and one pilot tenant before announcing recovery.
5. Record `RESTORE_COMPLETED` / `RESTORE_FAILED` (the CLI writes system events).

Do not restore staging data into production.
