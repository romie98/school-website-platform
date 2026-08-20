import {
  ClipboardList,
  GraduationCap,
  Users,
  CalendarDays,
  Download,
  Phone,
  BookOpen,
  Landmark,
  Wrench,
  Atom,
  Briefcase,
  Globe,
  Newspaper,
  Wrench as Hammer,
} from 'lucide-react'

const map = {
  ClipboardList,
  GraduationCap,
  Users,
  CalendarDays,
  Download,
  Phone,
  BookOpen,
  Landmark,
  Wrench,
  Atom,
  Briefcase,
  Globe,
  Newspaper,
  Hammer,
} as const

export type IconName = keyof typeof map

export function NamedIcon({ name, className }: { name: string; className?: string }) {
  const Icon = map[name as IconName] ?? CalendarDays
  return <Icon className={className} />
}
