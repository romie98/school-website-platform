import { isHeritageTheme } from '@/themes/heritage'

export function GoldRule({ className = '', light = false }: { className?: string; light?: boolean }) {
  const tone = light ? 'bg-gold' : 'bg-gold-dark'
  return (
    <div className={`flex max-w-xs items-center gap-3 ${className}`} aria-hidden>
      <span className={`h-px flex-1 ${tone}`} />
      <span className={`h-1.5 w-1.5 rotate-45 ${tone}`} />
      <span className={`h-px flex-1 ${tone}`} />
    </div>
  )
}

export { isHeritageTheme }
