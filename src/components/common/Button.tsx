import { TenantLink as Link } from '@/components/common/TenantLink'
import { classNames } from '@/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'gold' | 'outline'

interface ButtonProps {
  children: React.ReactNode
  href?: string
  onClick?: () => void
  type?: 'button' | 'submit'
  variant?: Variant
  className?: string
  disabled?: boolean
}

const styles: Record<Variant, string> = {
  primary: 'bg-gold text-brand-dark hover:bg-gold-dark font-semibold shadow-sm',
  secondary: 'bg-brand text-white hover:bg-brand-mid font-semibold',
  ghost: 'bg-transparent text-white border border-white/70 hover:bg-white/10 font-semibold',
  gold: 'bg-gold text-brand-dark hover:brightness-95 font-semibold',
  outline: 'border-2 border-brand text-brand hover:bg-brand hover:text-white font-semibold',
}

export function Button({
  children,
  href,
  onClick,
  type = 'button',
  variant = 'primary',
  className,
  disabled,
}: ButtonProps) {
  const cls = classNames(
    'inline-flex items-center justify-center gap-2 rounded-md px-5 py-2.5 text-sm tracking-wide transition-all duration-200 focus-visible:outline-none disabled:opacity-60',
    styles[variant],
    className,
  )

  if (href) {
    if (href.startsWith('http')) {
      return (
        <a href={href} className={cls} target="_blank" rel="noreferrer">
          {children}
        </a>
      )
    }
    return (
      <Link to={href} className={cls}>
        {children}
      </Link>
    )
  }

  return (
    <button type={type} onClick={onClick} className={cls} disabled={disabled}>
      {children}
    </button>
  )
}
