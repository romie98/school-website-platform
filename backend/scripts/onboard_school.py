"""Onboard a single production school tenant.

Run from backend/:

    python -m scripts.onboard_school \\
      --name "Bel-Air High School" \\
      --slug belair-high \\
      --domain belair.schoolplatform.com \\
      --admin-email admin@belairhighschoolja.com \\
      --principal-email principal@belairhighschoolja.com
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.services.onboard_service import (
    OnboardError,
    OnboardSpec,
    format_summary,
    onboard_school,
    require_production_confirmation,
    validate_spec,
)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Create one school tenant without demo/test fixtures. Passwords are generated, never accepted as CLI arguments.",
    )
    parser.add_argument("--name", required=True, help="School display name")
    parser.add_argument("--slug", required=True, help="URL slug, e.g. belair-high")
    parser.add_argument("--domain", default="", help="Platform host. Defaults to {slug}.{PLATFORM_DOMAIN}")
    parser.add_argument("--custom-domain", default="", help="Optional custom domain (not verified unless requested)")
    parser.add_argument(
        "--verify-custom-domain",
        action="store_true",
        help="Mark the custom domain verified. Default is unverified.",
    )
    parser.add_argument("--admin-email", required=True, help="Initial school administrator email")
    parser.add_argument("--admin-name", default="", help="Administrator display name")
    parser.add_argument("--principal-email", default="", help="Optional principal email")
    parser.add_argument("--principal-name", default="", help="Principal display name")
    parser.add_argument("--template", default="", help="empty (default) or basic")
    parser.add_argument("--theme", default="classic")
    parser.add_argument("--primary-color", default="")
    parser.add_argument("--secondary-color", default="")
    parser.add_argument("--accent-color", default="")
    parser.add_argument("--motto", default="")
    parser.add_argument("--short-name", default="")
    parser.add_argument("--status", default="active", help="School status: active, trial, suspended, archived")
    parser.add_argument("--subscription-status", default="active")
    parser.add_argument("--import", dest="import_source", default="", help="Optional future content importer id")
    parser.add_argument(
        "--yes",
        action="store_true",
        help="Skip the production confirmation prompt",
    )
    return parser


def spec_from_args(args: argparse.Namespace) -> OnboardSpec:
    return OnboardSpec(
        name=args.name,
        slug=args.slug,
        admin_email=args.admin_email,
        admin_name=args.admin_name,
        principal_email=args.principal_email,
        principal_name=args.principal_name,
        domain=args.domain,
        custom_domain=args.custom_domain,
        verify_custom_domain=bool(args.verify_custom_domain),
        template=args.template,
        theme=args.theme,
        primary_color=args.primary_color,
        secondary_color=args.secondary_color,
        accent_color=args.accent_color,
        motto=args.motto,
        short_name=args.short_name,
        status=args.status,
        subscription_status=args.subscription_status,
        import_source=args.import_source or None,
    )


def run(db: Session, spec: OnboardSpec, *, yes: bool = False, output=sys.stdout, confirm=None) -> int:
    settings = get_settings()
    try:
        spec = validate_spec(spec)
        require_production_confirmation(
            settings.environment,
            school_name=spec.name,
            slug=spec.slug,
            yes=yes,
            confirm=confirm,
            output=output,
        )
        result = onboard_school(db, spec)
        db.commit()
    except OnboardError as exc:
        db.rollback()
        print(str(exc), file=sys.stderr)
        return 1
    except Exception:
        db.rollback()
        print("Onboarding failed and was rolled back.", file=sys.stderr)
        raise
    output.write(format_summary(result))
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    spec = spec_from_args(args)
    db = SessionLocal()
    try:
        return run(db, spec, yes=bool(args.yes))
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
