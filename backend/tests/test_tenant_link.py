from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[2]


def test_with_tenant_helper_contract():
    result = subprocess.run(
        ["node", "--experimental-strip-types", "--test", "src/utils/tenantLink.test.ts"],
        cwd=ROOT,
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, result.stdout + result.stderr


def test_public_navigation_uses_tenant_link():
    navbar = (ROOT / "src/components/layout/Navbar.tsx").read_text(encoding="utf-8")
    footer = (ROOT / "src/components/layout/Footer.tsx").read_text(encoding="utf-8")
    assert "TenantNavLink" in navbar
    assert "TenantLink" in navbar
    assert "from 'react-router-dom'" in navbar
    assert "TenantLink as Link" in footer
    assert "from 'react-router-dom'" not in footer
