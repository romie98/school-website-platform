import { isHeritageTheme } from '@/themes/heritage'
import { GoldRule } from '@/components/common/GoldRule'
import { useTenant } from '@/contexts/TenantContext'

interface SectionHeaderProps {
  eyebrow?: string
  title: string
  description?: string
  align?: 'left' | 'center'
  light?: boolean
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  align = 'left',
  light = false,
}: SectionHeaderProps) {
  const { theme } = useTenant()
  const heritage = isHeritageTheme(theme)
  const centered = align === 'center'

  if (heritage) {
    return (
      <div className={centered ? 'mx-auto max-w-2xl text-center' : 'max-w-3xl'}>
        {eyebrow && (
          <p className={`text-[11px] font-semibold uppercase tracking-[0.28em] ${light ? 'text-gold' : 'text-gold-dark'}`}>
            {eyebrow}
          </p>
        )}
        <h2 className={`mt-2 font-display text-3xl font-semibold tracking-[0.06em] md:text-4xl ${light ? 'text-white' : 'text-brand'}`}>
          {title}
        </h2>
        <GoldRule className={`mt-4 ${centered ? 'mx-auto' : ''}`} light={light} />
        {description && (
          <p className={`mt-4 text-base leading-relaxed ${light ? 'text-white/80' : 'text-muted'}`}>
            {description}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className={centered ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      {eyebrow && (
        <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${light ? 'text-gold' : 'text-brand-mid'}`}>
          {eyebrow}
        </p>
      )}
      <h2 className={`mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl ${light ? 'text-white' : 'text-brand'}`}>
        {title}
      </h2>
      <span className={`mt-3 block h-1 w-16 rounded-full ${centered ? 'mx-auto' : ''} bg-gold`} />
      {description && (
        <p className={`mt-4 text-base leading-relaxed ${light ? 'text-white/80' : 'text-muted'}`}>
          {description}
        </p>
      )}
    </div>
  )
}
