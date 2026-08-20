import { useState } from 'react'
import { AdminHeader, Field, adminInput } from '@/components/admin/AdminChrome'
import { useToast } from '@/components/admin/Toast'
import { useTenant } from '@/contexts/TenantContext'
import { settingsService, writeMessage, conflictText } from '@/services/collections'
import { FONT_OPTIONS, THEME_PRESETS, getThemePreset } from '@/themes/presets'

const LAYOUTS = {
  heroStyle: ['full-image', 'split', 'slideshow', 'compact', 'cinematic', 'spotlight'],
  navbarStyle: ['classic', 'modern', 'floating', 'centered', 'heritage', 'light'],
  newsLayout: ['grid', 'featured', 'cards', 'list', 'editorial'],
  eventsLayout: ['calendar', 'cards', 'timeline', 'list', 'date-list'],
  footerStyle: ['classic', 'modern', 'minimal', 'heritage', 'structured'],
}

export function ThemeEditor() {
  const { theme, refresh } = useTenant()
  const toast = useToast()
  const [form, setForm] = useState({
    theme: theme?.theme || 'classic',
    headingFont: theme?.headingFont || 'Montserrat',
    bodyFont: theme?.bodyFont || 'Inter',
    heroStyle: theme?.heroStyle || 'full-image',
    navbarStyle: theme?.navbarStyle || 'classic',
    newsLayout: theme?.newsLayout || 'featured',
    eventsLayout: theme?.eventsLayout || 'cards',
    footerStyle: theme?.footerStyle || 'classic',
  })
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const preset = getThemePreset(form.theme)

  const patch = (next: Partial<typeof form>) => {
    setForm((current) => ({ ...current, ...next }))
    setDirty(true)
  }

  return (
    <div>
      <AdminHeader
        title="Theme"
        description="Choose a base look for this school. Colours and logos are managed under Branding."
        extra={
          <button
            type="button"
            disabled={!dirty || busy}
            className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-brand-dark disabled:opacity-50"
            onClick={async () => {
              setBusy(true)
              try {
                const result = await settingsService.saveTheme(form)
                await refresh()
                setDirty(false)
                toast.push(writeMessage(result, 'Theme saved. Visitors will see it on the public site.'))
              } catch (err) {
                toast.push(conflictText(err), 'error')
              } finally {
                setBusy(false)
              }
            }}
          >
            {busy ? 'Saving…' : 'Save theme'}
          </button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {THEME_PRESETS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              patch({
                theme: item.id,
                headingFont: item.headingFont,
                bodyFont: item.bodyFont,
                heroStyle: item.heroStyle,
                navbarStyle: item.navbarStyle,
                newsLayout: item.newsLayout,
                eventsLayout: item.eventsLayout,
                footerStyle: item.footerStyle,
              })
            }}
            className={`rounded-lg border p-4 text-left ${form.theme === item.id ? 'border-gold bg-gold/10' : 'border-brand/10 bg-white'}`}
          >
            <p className="font-display text-lg font-bold text-brand">{item.label}</p>
            <p className="mt-1 text-sm text-muted">{item.description}</p>
            <p className="mt-3 text-xs text-muted">{item.headingFont} / {item.bodyFont}</p>
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-lg bg-white p-5">
          <h2 className="font-display text-lg font-bold text-brand">Typography</h2>
          <Field label="Heading font">
            <select className={adminInput} value={form.headingFont} onChange={(e) => patch({ headingFont: e.target.value })}>
              {FONT_OPTIONS.map((font) => <option key={font}>{font}</option>)}
            </select>
          </Field>
          <Field label="Body font">
            <select className={adminInput} value={form.bodyFont} onChange={(e) => patch({ bodyFont: e.target.value })}>
              {FONT_OPTIONS.map((font) => <option key={font}>{font}</option>)}
            </select>
          </Field>
          <p className="text-xs text-muted">Selecting a preset above fills these fonts. You can still override them.</p>
        </div>
        <div className="space-y-4 rounded-lg bg-white p-5">
          <h2 className="font-display text-lg font-bold text-brand">Layout preferences</h2>
          {(Object.keys(LAYOUTS) as (keyof typeof LAYOUTS)[]).map((key) => (
            <Field key={key} label={key.replace(/([A-Z])/g, ' $1')}>
              <select className={adminInput} value={form[key]} onChange={(e) => patch({ [key]: e.target.value })}>
                {LAYOUTS[key].map((option) => <option key={option}>{option}</option>)}
              </select>
            </Field>
          ))}
          <p className="text-xs text-muted">These preferences are stored now and used by the public theme. Homepage section variants are expanded in a later phase.</p>
        </div>
      </div>

      <div className="mt-8 rounded-lg bg-white p-6" style={{ fontFamily: `"${form.bodyFont}", sans-serif` }}>
        <p className="text-xs uppercase tracking-wider text-muted">{preset.label} preview</p>
        <h3 className="mt-2 text-2xl font-bold text-brand" style={{ fontFamily: `"${form.headingFont}", serif` }}>
          {theme ? 'Your school name in this theme' : 'Theme preview'}
        </h3>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Headings use {form.headingFont}. Body copy uses {form.bodyFont}. Navbar: {form.navbarStyle}. Footer: {form.footerStyle}.
        </p>
      </div>
    </div>
  )
}
