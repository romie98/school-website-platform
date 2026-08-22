import type { TenantTheme } from '@/types/tenant'
import { mediaUrl } from '@/services/normalize'

const FONT_QUERY: Record<string, string> = {
  Inter: 'Inter:wght@400;500;600;700',
  Montserrat: 'Montserrat:wght@500;600;700;800',
  Outfit: 'Outfit:wght@400;500;600;700',
  Merriweather: 'Merriweather:wght@400;700',
  'Source Sans 3': 'Source+Sans+3:wght@400;500;600;700',
  'Playfair Display': 'Playfair+Display:ital,wght@0,500;0,600;0,700;1,500;1,700',
  Lora: 'Lora:wght@400;500;600;700',
  'DM Sans': 'DM+Sans:wght@400;500;600;700',
  Cinzel: 'Cinzel:wght@500;600;700',
  'Libre Baskerville': 'Libre+Baskerville:wght@400;700',
}

function parseHex(hex: string) {
  const value = hex.replace('#', '').trim()
  const full = value.length === 3 ? value.split('').map((c) => c + c).join('') : value
  return {
    r: parseInt(full.slice(0, 2), 16) || 0,
    g: parseInt(full.slice(2, 4), 16) || 0,
    b: parseInt(full.slice(4, 6), 16) || 0,
  }
}

function toHex({ r, g, b }: { r: number; g: number; b: number }) {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)))
  return `#${[clamp(r), clamp(g), clamp(b)].map((n) => n.toString(16).padStart(2, '0')).join('')}`
}

export function darken(hex: string, amount = 0.35) {
  const { r, g, b } = parseHex(hex)
  return toHex({ r: r * (1 - amount), g: g * (1 - amount), b: b * (1 - amount) })
}

export function mixWithWhite(hex: string, amount = 0.88) {
  const { r, g, b } = parseHex(hex)
  return toHex({
    r: r + (255 - r) * amount,
    g: g + (255 - g) * amount,
    b: b + (255 - b) * amount,
  })
}

function loadFonts(heading: string, body: string) {
  const families = [...new Set([heading, body])]
    .map((name) => FONT_QUERY[name] || `${name.replace(/ /g, '+')}:wght@400;600;700`)
  const href = `https://fonts.googleapis.com/css2?${families.map((item) => `family=${item}`).join('&')}&display=swap`
  let link = document.getElementById('tenant-fonts') as HTMLLinkElement | null
  if (!link) {
    link = document.createElement('link')
    link.id = 'tenant-fonts'
    link.rel = 'stylesheet'
    document.head.appendChild(link)
  }
  if (link.href !== href) link.href = href
}

function setFavicon(url?: string | null) {
  if (!url) return
  const link = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null
  if (link) link.href = url
}

export function applyTheme(theme: TenantTheme | null, extras?: { faviconUrl?: string | null; schoolName?: string | null }) {
  if (!theme) return
  const root = document.documentElement
  const primary = theme.primaryColor
  const secondary = theme.secondaryColor
  const accent = theme.accentColor
  root.style.setProperty('--primary-color', primary)
  root.style.setProperty('--secondary-color', secondary)
  root.style.setProperty('--accent-color', accent)
  root.style.setProperty('--color-brand', primary)
  root.style.setProperty('--color-brand-dark', darken(primary, 0.4))
  root.style.setProperty('--color-brand-mid', accent || darken(primary, 0.15))
  root.style.setProperty('--color-brand-light', mixWithWhite(primary, 0.35))
  root.style.setProperty('--color-brand-soft', mixWithWhite(primary, 0.9))
  root.style.setProperty('--color-gold', secondary)
  root.style.setProperty('--color-gold-dark', darken(secondary, 0.25))
  root.style.setProperty('--color-gold-muted', mixWithWhite(secondary, 0.55))
  root.style.setProperty('--color-cream', mixWithWhite(primary, 0.94))
  root.style.setProperty('--font-display', `"${theme.headingFont}", ui-serif, ui-sans-serif, system-ui, sans-serif`)
  root.style.setProperty('--font-sans', `"${theme.bodyFont}", ui-sans-serif, system-ui, sans-serif`)
  root.style.setProperty('--radius-theme', theme.radius || '0.5rem')
  if (theme.theme === 'heritage') {
    root.style.setProperty('--color-cream', '#FFF9E8')
    root.style.setProperty('--color-gold-dark', '#C99A00')
    root.style.setProperty('--color-brand-dark', primary)
    root.style.setProperty('--color-brand-mid', accent || '#4A3500')
    root.style.setProperty('--color-muted', '#5C4A2A')
    root.style.setProperty('--shadow-card', '0 10px 28px -18px rgb(36 26 0 / 0.35)')
    root.style.setProperty('--shadow-nav', '0 8px 24px -12px rgb(36 26 0 / 0.45)')
    root.style.setProperty('--radius-theme', theme.radius || '0.125rem')
  } else if (theme.theme === 'minimal') {
    root.style.setProperty('--color-cream', '#F5F7FB')
    root.style.setProperty('--color-muted', '#4B5563')
    root.style.setProperty('--shadow-card', '0 1px 0 rgb(0 0 0 / 0.06)')
    root.style.setProperty('--shadow-nav', 'none')
  } else if (theme.theme === 'sky') {
    root.style.setProperty('--color-cream', '#F5FBFD')
    root.style.setProperty('--color-brand-soft', '#EAF8FC')
    root.style.setProperty('--color-brand-dark', '#073B52')
    root.style.setProperty('--color-brand-mid', accent || '#167EA5')
    root.style.setProperty('--color-gold-dark', '#167EA5')
    root.style.setProperty('--color-muted', '#374151')
    root.style.setProperty('--color-ink', '#111827')
    root.style.setProperty('--shadow-card', '0 16px 40px -24px rgb(7 59 82 / 0.28)')
    root.style.setProperty('--shadow-nav', '0 10px 28px -18px rgb(7 59 82 / 0.22)')
  } else {
    root.style.removeProperty('--color-muted')
    root.style.removeProperty('--color-ink')
    root.style.removeProperty('--color-brand-soft')
    root.style.removeProperty('--shadow-card')
    root.style.removeProperty('--shadow-nav')
  }
  root.dataset.theme = theme.theme
  root.dataset.navbar = theme.navbarStyle
  root.dataset.footer = theme.footerStyle
  document.body.style.fontFamily = `var(--font-sans)`
  loadFonts(theme.headingFont, theme.bodyFont)
  setFavicon(mediaUrl(theme.faviconUrl) || mediaUrl(extras?.faviconUrl))
  const themeColor = document.querySelector('meta[name="theme-color"]')
  if (themeColor) themeColor.setAttribute('content', primary)
  if (extras?.schoolName) {
    const og = document.querySelector('meta[property="og:site_name"]')
    if (og) og.setAttribute('content', extras.schoolName)
  }
}
