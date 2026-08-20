from __future__ import annotations

import argparse
import sys

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.services.backup_service import create_backup, restore_backup, serialize_backup


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="School platform backup and restore")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("backup", help="Create a full database + media backup for this environment")
    restore = sub.add_parser("restore", help="Restore a backup directory into this environment")
    restore.add_argument("--path", required=True, help="Backup directory created by the backup command")
    args = parser.parse_args(argv)
    settings = get_settings()
    if args.command == "backup":
        db = SessionLocal()
        try:
            run = create_backup(db)
            print(serialize_backup(run))
            return 0 if run.status == "SUCCESS" else 1
        finally:
            db.close()
    if args.command == "restore":
        print(f"Restoring {args.path} into environment={settings.environment}")
        print(restore_backup(args.path))
        return 0
    return 1


if __name__ == "__main__":
    sys.exit(main())
