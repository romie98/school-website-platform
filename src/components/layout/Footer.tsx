import { Link } from 'react-router-dom'
import { Mail, Phone, Clock, MapPin } from 'lucide-react'
import { FacebookIcon, InstagramIcon, YoutubeIcon } from '@/components/common/SocialIcons'
import { SchoolCrest } from '@/components/common/SchoolCrest'
import { useContent } from '@/hooks/useContent'
import { useTenant } from '@/contexts/TenantContext'

export function Footer() {
  const { contact, branding } = useContent()
  const { school, theme } = useTenant()
  const year = new Date().getFullYear()
  const crest = branding.crestMedia?.url || branding.crestUrl || school?.logoUrl
  const name = branding.schoolName || contact.schoolName
  const variant = theme?.footerStyle || 'classic'

  if (variant === 'minimal') {
    return (
      <footer data-footer="minimal" className="bg-brand text-white">
        <div className="page-wrap flex flex-col items-center gap-3 py-10 text-center">
          <SchoolCrest className="h-12 w-12" src={crest || undefined} />
          <p className="font-display font-bold">{name}</p>
          <div className="flex gap-4 text-sm text-white/80">
            <Link to="/about" className="hover:text-gold">About</Link>
            <Link to="/news" className="hover:text-gold">News</Link>
            <Link to="/contact" className="hover:text-gold">Contact</Link>
          </div>
          <p className="text-xs text-white/60">© {year} {name}. All Rights Reserved.</p>
        </div>
      </footer>
    )
  }

  if (variant === 'structured') {
    return (
      <footer data-footer="structured" className="bg-brand-dark text-white">
        <div className="page-wrap grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-3">
              <SchoolCrest className="h-14 w-14" src={crest || undefined} title={`${name} crest`} />
              <p className="font-display text-lg font-bold">{name}</p>
            </div>
            {branding.motto ? <p className="mt-4 text-sm text-white/75">{branding.motto}</p> : null}
            <div className="mt-4 flex gap-3">
              {(contact.social ?? []).filter((s) => s.enabled && s.href).map((s) => (
                <a key={s.platform} href={s.href} className="rounded-md bg-white/10 p-2 text-gold hover:bg-gold hover:text-brand-dark" aria-label={s.platform}>
                  {s.platform === 'Facebook' && <FacebookIcon className="h-4 w-4" />}
                  {s.platform === 'Instagram' && <InstagramIcon className="h-4 w-4" />}
                  {s.platform === 'YouTube' && <YoutubeIcon className="h-4 w-4" />}
                  {!['Facebook', 'Instagram', 'YouTube'].includes(s.platform) && <span className="block h-4 w-4 text-center text-[10px] font-bold">{s.platform[0]}</span>}
                </a>
              ))}
            </div>
          </div>
          <div>
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-gold">School</h2>
            <ul className="mt-4 space-y-2 text-sm text-white/80">
              <li><Link to="/about" className="hover:text-gold">About</Link></li>
              <li><Link to="/academics" className="hover:text-gold">Academics</Link></li>
              <li><Link to="/admissions" className="hover:text-gold">Admissions</Link></li>
              <li><Link to="/school-life" className="hover:text-gold">Student Life</Link></li>
            </ul>
          </div>
          <div>
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-gold">Resources</h2>
            <ul className="mt-4 space-y-2 text-sm text-white/80">
              <li><Link to="/news" className="hover:text-gold">News</Link></li>
              <li><Link to="/events" className="hover:text-gold">Events</Link></li>
              <li><Link to="/resources" className="hover:text-gold">Downloads</Link></li>
              <li><Link to="/resources" className="hover:text-gold">Policies</Link></li>
            </ul>
          </div>
          <div>
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-gold">Contact</h2>
            <ul className="mt-4 space-y-3 text-sm text-white/80">
              {(contact.addressLines ?? []).length ? <li className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" /><span>{contact.addressLines.join(', ')}</span></li> : null}
              {(contact.phone ?? []).length ? <li className="flex gap-2"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-gold" /><span>{contact.phone.join(' · ')}</span></li> : null}
              {(contact.email ?? []).length ? <li className="flex gap-2"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-gold" /><a href={`mailto:${contact.email[0]}`} className="hover:text-gold">{contact.email[0]}</a></li> : null}
              {contact.officeHours ? <li className="flex gap-2"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-gold" /><span>{contact.officeHours}</span></li> : null}
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="page-wrap py-4 text-xs text-white/60">© {year} {name}</div>
        </div>
      </footer>
    )
  }

  if (variant === 'heritage') {
    return (
      <footer data-footer="heritage" className="bg-brand text-white">
        <div className="h-px bg-gold" />
        <div className="page-wrap grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <SchoolCrest className="h-16 w-16" src={crest || undefined} title={`${name} crest`} />
            <p className="mt-4 font-display text-lg font-semibold tracking-[0.06em]">{name}</p>
            {branding.motto ? <p className="mt-1 font-display text-sm italic tracking-[0.16em] text-gold">{branding.motto}</p> : null}
          </div>
          <div>
            <h2 className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-gold">Quick links</h2>
            <ul className="mt-4 space-y-2 text-sm text-white/80">
              <li><Link to="/about" className="hover:text-gold">About</Link></li>
              <li><Link to="/academics" className="hover:text-gold">Academics</Link></li>
              <li><Link to="/students" className="hover:text-gold">Students</Link></li>
              <li><Link to="/news" className="hover:text-gold">News</Link></li>
            </ul>
          </div>
          <div>
            <h2 className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-gold">Information</h2>
            <ul className="mt-4 space-y-2 text-sm text-white/80">
              <li><Link to="/events" className="hover:text-gold">Calendar</Link></li>
              <li><Link to="/gallery" className="hover:text-gold">Gallery</Link></li>
              <li><Link to="/resources" className="hover:text-gold">Documents</Link></li>
              <li><Link to="/contact" className="hover:text-gold">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h2 className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-gold">Contact</h2>
            <ul className="mt-4 space-y-3 text-sm text-white/80">
              <li className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" /><span>{(contact.addressLines ?? []).join(', ')}</span></li>
              <li className="flex gap-2"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-gold" /><span>{contact.phone.join(' · ')}</span></li>
              <li className="flex gap-2"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-gold" /><a href={`mailto:${contact.email[0]}`} className="hover:text-gold">{contact.email[0]}</a></li>
            </ul>
            <div className="mt-5 flex gap-3">
              {(contact.social ?? []).filter((s) => s.enabled && s.href).map((s) => (
                <a key={s.platform} href={s.href} className="border border-gold/40 p-2 text-gold hover:bg-gold hover:text-brand-dark" aria-label={s.platform}>
                  {s.platform === 'Facebook' && <FacebookIcon className="h-4 w-4" />}
                  {s.platform === 'Instagram' && <InstagramIcon className="h-4 w-4" />}
                  {s.platform === 'YouTube' && <YoutubeIcon className="h-4 w-4" />}
                  {!['Facebook', 'Instagram', 'YouTube'].includes(s.platform) && <span className="block h-4 w-4 text-center text-[10px] font-bold">{s.platform[0]}</span>}
                </a>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t border-gold/25">
          <div className="page-wrap py-4 text-center text-xs tracking-wide text-white/60">
            © {year} {name}
          </div>
        </div>
      </footer>
    )
  }

  const linkCols = variant === 'modern' ? 'md:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-4'

  return (
    <footer data-footer={variant} className="bg-brand-dark text-white">
      <div className={`page-wrap grid gap-10 py-14 ${linkCols}`}>
        <div>
          <div className="flex items-center gap-3">
            <SchoolCrest className="h-14 w-14" src={crest || undefined} />
            <p className="font-display text-lg font-bold">{branding.schoolName || contact.schoolName}</p>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-white/75">
            {branding.motto || contact.schoolName}
          </p>
          <div className="mt-4 flex gap-3">
            {(contact.social ?? []).filter((s) => s.enabled && s.href).map((s) => (
              <a
                key={s.platform}
                href={s.href}
                className="rounded-md bg-white/10 p-2 text-gold hover:bg-gold hover:text-brand-dark"
                aria-label={s.platform}
              >
                {s.platform === 'Facebook' && <FacebookIcon className="h-4 w-4" />}
                {s.platform === 'Instagram' && <InstagramIcon className="h-4 w-4" />}
                {s.platform === 'YouTube' && <YoutubeIcon className="h-4 w-4" />}
                {!['Facebook', 'Instagram', 'YouTube'].includes(s.platform) && (
                  <span className="block h-4 w-4 text-center text-[10px] font-bold leading-4">{s.platform[0]}</span>
                )}
              </a>
            ))}
          </div>
        </div>

        <div>
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-gold">Quick Links</h2>
          <ul className="mt-4 space-y-2 text-sm text-white/80">
            <li><Link to="/about" className="hover:text-gold">About</Link></li>
            <li><Link to="/academics" className="hover:text-gold">Academics</Link></li>
            <li><Link to="/admissions" className="hover:text-gold">Admissions</Link></li>
            <li><Link to="/students" className="hover:text-gold">Students</Link></li>
            <li><Link to="/parents" className="hover:text-gold">Parents</Link></li>
          </ul>
        </div>

        <div>
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-gold">Resources</h2>
          <ul className="mt-4 space-y-2 text-sm text-white/80">
            <li><Link to="/news" className="hover:text-gold">News</Link></li>
            <li><Link to="/events" className="hover:text-gold">Calendar</Link></li>
            <li><Link to="/resources" className="hover:text-gold">Downloads</Link></li>
            <li><Link to="/gallery" className="hover:text-gold">Gallery</Link></li>
            <li><Link to="/contact" className="hover:text-gold">Contact</Link></li>
          </ul>
        </div>

        <div>
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-gold">Contact</h2>
          <ul className="mt-4 space-y-3 text-sm text-white/80">
            <li className="flex gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
              <span>{(contact.addressLines ?? []).join(', ')}</span>
            </li>
            <li className="flex gap-2">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
              <span>{contact.phone.join(' · ')}</span>
            </li>
            <li className="flex gap-2">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
              <a href={`mailto:${contact.email[0]}`} className="hover:text-gold">{contact.email[0]}</a>
            </li>
            <li className="flex gap-2">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
              <span>{contact.officeHours}</span>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="page-wrap flex flex-col gap-2 py-4 text-xs text-white/60 sm:flex-row sm:justify-between">
          <p>© {year} {branding.schoolName || contact.schoolName}. All Rights Reserved.</p>
          <p>{(contact.addressLines ?? []).join(', ')}</p>
        </div>
      </div>
    </footer>
  )
}
