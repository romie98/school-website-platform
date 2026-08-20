import { useTenant } from '@/contexts/TenantContext'
import { isHeritageTheme } from '@/themes/heritage'

interface SchoolCrestProps {
  className?: string
  title?: string
  src?: string | null
}

function HeritageCrest({ className, title }: { className: string; title: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} role="img" aria-label={title}>
      <title>{title}</title>
      <path d="M100 12 L178 42 V102 C178 148 142 176 100 192 C58 176 22 148 22 102 V42 Z" fill="var(--color-brand)" stroke="var(--color-gold)" strokeWidth="5" />
      <path d="M100 28 L162 50 V102 C162 138 134 160 100 174 C66 160 38 138 38 102 V50 Z" fill="none" stroke="var(--color-gold)" strokeWidth="1.5" />
      <path d="M100 46 L118 86 H82 Z" fill="var(--color-gold)" />
      <rect x="70" y="98" width="60" height="8" fill="var(--color-gold)" />
      <path d="M70 118 H130" stroke="var(--color-gold)" strokeWidth="2" />
      <rect x="96" y="136" width="8" height="8" fill="var(--color-gold)" transform="rotate(45 100 140)" />
    </svg>
  )
}

export function SchoolCrest({ className = 'h-16 w-16', title = 'School crest', src }: SchoolCrestProps) {
  const { theme } = useTenant()
  if (src) {
    return <img src={src} alt={title} className={`${className} object-contain`} />
  }
  if (isHeritageTheme(theme)) {
    return <HeritageCrest className={className} title={title} />
  }
  return (
    <svg viewBox="0 0 200 200" className={className} role="img" aria-label={title}>
      <title>{title}</title>
      <circle cx="100" cy="100" r="98" fill="var(--color-brand)" />
      <circle cx="100" cy="100" r="93" fill="none" stroke="var(--color-gold)" strokeWidth="3.5" />
      <circle cx="100" cy="100" r="86" fill="none" stroke="var(--color-gold)" strokeWidth="1" />

      <path
        d="M100 18 C 128 38, 156 42, 178 46 C 170 92, 148 132, 100 168 C 52 132, 30 92, 22 46 C 44 42, 72 38, 100 18 Z"
        fill="var(--color-cream)"
        stroke="var(--color-gold)"
        strokeWidth="2.2"
      />
      <path
        d="M100 26 C 124 44, 148 48, 168 51 C 161 92, 142 126, 100 156 C 58 126, 39 92, 32 51 C 52 48, 76 44, 100 26 Z"
        fill="var(--color-brand)"
      />

      <rect x="46" y="48" width="108" height="22" rx="2" fill="var(--color-gold)" />
      <text
        x="100"
        y="64"
        textAnchor="middle"
        fill="var(--color-brand)"
        fontFamily="var(--font-display), Arial, sans-serif"
        fontSize="11"
        fontWeight="700"
        letterSpacing="1.5"
      >
        SCHOOL
      </text>

      <g fill="none" stroke="var(--color-gold)" strokeWidth="1.8" strokeLinecap="round">
        <path d="M78 86 h44" />
        <path d="M82 90 h36" />
        <path d="M74 86 v18 h52 v-18" />
        <path d="M74 104 c8 8 18 12 26 12 s18-4 26-12" />
      </g>
      <path d="M100 78 l-3 10 h6 z" fill="var(--color-gold)" />
      <circle cx="100" cy="76" r="3.2" fill="var(--color-gold)" />

      <path d="M70 118 c8 10 18 8 30 0 c12 8 22 10 30 0" fill="none" stroke="var(--color-gold)" strokeWidth="1.6" />
      <path d="M78 128 c14 8 30 8 44 0" fill="none" stroke="var(--color-gold)" strokeWidth="1.4" />
      <circle cx="88" cy="116" r="3" fill="var(--color-gold)" />
      <circle cx="112" cy="116" r="3" fill="var(--color-gold)" />
      <path d="M91 116 h18" stroke="var(--color-gold)" strokeWidth="1.6" />

      <path
        d="M28 168 h144 l-10 18 H38 z"
        fill="var(--color-gold)"
      />
      <text
        x="100"
        y="181"
        textAnchor="middle"
        fill="var(--color-brand)"
        fontFamily="var(--font-display), Arial, sans-serif"
        fontSize="7.2"
        fontWeight="700"
        letterSpacing="0.4"
      >
        UNITY · LEARNING · EXCELLENCE
      </text>
    </svg>
  )
}
