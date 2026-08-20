import { useState } from 'react'
import { Mail, Phone, Clock, MapPin } from 'lucide-react'
import { PageMeta } from '@/components/common/PageMeta'
import { PageHero } from '@/components/common/PageBits'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { Button } from '@/components/common/Button'
import { useContent } from '@/hooks/useContent'
import { photos } from '@/data/images'
import type { ContactDepartment } from '@/types'

const departments: ContactDepartment[] = [
  'General Enquiry',
  'Admissions',
  "Principal's Office",
  'Guidance',
  'Bursar',
  'Examination Centre',
  'PTA',
]

interface FormState {
  name: string
  email: string
  telephone: string
  subject: string
  department: ContactDepartment
  message: string
}

const empty: FormState = {
  name: '',
  email: '',
  telephone: '',
  subject: '',
  department: 'General Enquiry',
  message: '',
}

export function Contact() {
  const { contact, branding } = useContent()
  const [form, setForm] = useState<FormState>(empty)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const validate = () => {
    const next: Partial<Record<keyof FormState, string>> = {}
    if (!form.name.trim()) next.name = 'Please enter your name.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Enter a valid email address.'
    if (form.telephone && form.telephone.replace(/\D/g, '').length < 7) next.telephone = 'Enter a valid telephone number.'
    if (!form.subject.trim()) next.subject = 'Please add a subject.'
    if (form.message.trim().length < 10) next.message = 'Please write a short message (at least 10 characters).'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) {
      setStatus('error')
      return
    }
    setStatus('success')
    setForm(empty)
  }

  const field = (key: keyof FormState) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.value }))
      setStatus('idle')
    },
  })

  return (
    <>
      <PageMeta title="Contact Us" description={`Address, telephone, office hours and enquiry form for ${branding.schoolName}.`} path="/contact" />
      <PageHero title="Contact Us" subtitle="The school office is open on weekdays during term." image={photos.courtyard} />
      <div className="page-wrap section-space">
        <Breadcrumbs items={[{ label: 'Contact' }]} />
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-2xl font-bold text-brand">{contact.schoolName}</h2>
            <ul className="mt-6 space-y-3 text-muted">
              <li className="flex gap-3"><MapPin className="h-5 w-5 text-gold-dark" />{contact.addressLines.join(', ')}</li>
              <li className="flex gap-3"><Phone className="h-5 w-5 text-gold-dark" />{contact.phone.join(' · ')}</li>
              <li className="flex gap-3"><Mail className="h-5 w-5 text-gold-dark" />{contact.email.join(' · ')}</li>
              <li className="flex gap-3"><Clock className="h-5 w-5 text-gold-dark" />{contact.officeHours}</li>
            </ul>
            <div className="mt-8 overflow-hidden rounded-lg border border-brand/10">
              <iframe title={`Map of ${contact.schoolName}`} src={contact.mapEmbedUrl} className="h-72 w-full" loading="lazy" />
            </div>
          </div>
          <form onSubmit={onSubmit} noValidate className="rounded-lg border border-brand/10 bg-white p-6 shadow-[var(--shadow-card)]">
            <h2 className="font-display text-xl font-bold text-brand">Send a message</h2>
            {status === 'success' && <p className="mt-3 rounded-md bg-brand-soft px-3 py-2 text-sm text-brand" role="status">Thank you. Your message has been recorded. The office will respond during school hours.</p>}
            {status === 'error' && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">Please correct the highlighted fields.</p>}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-brand">Name
                <input required className="mt-1 w-full rounded-md border border-brand/20 px-3 py-2 text-ink" {...field('name')} />
                {errors.name && <span className="text-xs text-red-700">{errors.name}</span>}
              </label>
              <label className="text-sm font-medium text-brand">Email
                <input type="email" required className="mt-1 w-full rounded-md border border-brand/20 px-3 py-2 text-ink" {...field('email')} />
                {errors.email && <span className="text-xs text-red-700">{errors.email}</span>}
              </label>
              <label className="text-sm font-medium text-brand">Telephone
                <input className="mt-1 w-full rounded-md border border-brand/20 px-3 py-2 text-ink" {...field('telephone')} />
                {errors.telephone && <span className="text-xs text-red-700">{errors.telephone}</span>}
              </label>
              <label className="text-sm font-medium text-brand">Department
                <select className="mt-1 w-full rounded-md border border-brand/20 px-3 py-2 text-ink" {...field('department')}>
                  {departments.map((d) => <option key={d}>{d}</option>)}
                </select>
              </label>
            </div>
            <label className="mt-4 block text-sm font-medium text-brand">Subject
              <input required className="mt-1 w-full rounded-md border border-brand/20 px-3 py-2 text-ink" {...field('subject')} />
              {errors.subject && <span className="text-xs text-red-700">{errors.subject}</span>}
            </label>
            <label className="mt-4 block text-sm font-medium text-brand">Message
              <textarea required rows={5} className="mt-1 w-full rounded-md border border-brand/20 px-3 py-2 text-ink" {...field('message')} />
              {errors.message && <span className="text-xs text-red-700">{errors.message}</span>}
            </label>
            <Button type="submit" className="mt-5">Send message</Button>
          </form>
        </div>
      </div>
    </>
  )
}
