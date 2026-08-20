import { PageMeta } from '@/components/common/PageMeta'
import { PageHero, CTASection } from '@/components/common/PageBits'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { SectionHeader } from '@/components/common/SectionHeader'
import { Button } from '@/components/common/Button'
import { useContent } from '@/hooks/useContent'
import { photos } from '@/data/images'
import { useState } from 'react'

export function Admissions() {
  const { admissions, contact, branding } = useContent()
  const [open, setOpen] = useState<number | null>(0)
  return (
    <>
      <PageMeta title="Admissions" description={`How to apply to ${branding.schoolName}, including requirements, documents and deadlines.`} path="/admissions" />
      <PageHero title="Admissions" subtitle="Join a school community that expects excellence and looks after its students." image={photos.students} />
      <div className="page-wrap section-space">
        <Breadcrumbs items={[{ label: 'Admissions' }]} />
        <div className="flex flex-wrap gap-3">
          <Button href="/contact">Contact Admissions</Button>
          <Button href="/resources" variant="outline">Application forms</Button>
        </div>
        {admissions.intro.map((p) => (
          <p key={p} className="mt-4 max-w-3xl leading-relaxed text-muted">{p}</p>
        ))}

        <section className="mt-14">
          <SectionHeader title="Entry requirements" />
          <ul className="mt-6 space-y-2">
            {admissions.requirements.map((item) => (
              <li key={item} className="rounded-md bg-cream px-4 py-3 text-sm text-ink">{item}</li>
            ))}
          </ul>
        </section>

        <section className="mt-14">
          <SectionHeader title="Application process" description="Five clear steps from enquiry to enrolment." />
          <ol className="mt-8 grid gap-4 md:grid-cols-5">
            {admissions.process.map((step) => (
              <li key={step.step} className="rounded-lg border border-brand/10 bg-white p-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-gold font-display font-bold text-brand-dark">{step.step}</span>
                <h3 className="mt-3 font-display font-bold text-brand">{step.title}</h3>
                <p className="mt-2 text-sm text-muted">{step.detail}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-14 grid gap-10 lg:grid-cols-2">
          <div>
            <SectionHeader title="Required documents" />
            <ul className="mt-4 list-disc space-y-1 pl-5 text-muted">
              {admissions.documents.map((d) => <li key={d}>{d}</li>)}
            </ul>
          </div>
          <div>
            <SectionHeader title="Transfer students" />
            {admissions.transfers.map((p) => <p key={p} className="mt-4 text-muted">{p}</p>)}
          </div>
        </section>

        <section className="mt-14">
          <SectionHeader title="Important deadlines" />
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="bg-brand text-white">
                <tr><th className="px-4 py-2 font-medium">Item</th><th className="px-4 py-2 font-medium">When</th></tr>
              </thead>
              <tbody>
                {admissions.deadlines.map((d) => (
                  <tr key={d.label} className="border-b border-brand/10">
                    <td className="px-4 py-3">{d.label}</td>
                    <td className="px-4 py-3 text-muted">{d.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-14">
          <SectionHeader title="Frequently asked questions" />
          <div className="mt-6 divide-y divide-brand/10 rounded-lg border border-brand/10">
            {admissions.faqs.map((faq, i) => (
              <div key={faq.question}>
                <button type="button" className="flex w-full items-center justify-between px-4 py-3 text-left font-medium text-brand" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
                  {faq.question}
                </button>
                {open === i && <p className="px-4 pb-4 text-sm text-muted">{faq.answer}</p>}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14 rounded-lg bg-brand p-8 text-white">
          <h2 className="font-display text-2xl font-bold">Admissions contact</h2>
          <p className="mt-2 text-white/80">{contact.addressLines.join(', ')}</p>
          <p className="mt-1">{contact.phone[0]} · {contact.email[1] ?? contact.email[0]}</p>
          <p className="mt-1 text-sm text-gold">{contact.officeHours}</p>
        </section>
      </div>
      <CTASection title="Ready to apply?" primary={{ label: 'Apply / Contact Admissions', href: '/contact' }} secondary={{ label: 'Downloads', href: '/resources' }} />
    </>
  )
}
