import { BuildingIcon, CalendarIcon, HandshakeIcon, MicIcon, NewspaperIcon, RocketIcon, type LucideIcon } from "lucide-react"

import { agendaCards, orderSpeakers, organizationCard, speakerCard, startupCard, type CardModel } from "@/lib/cards"
import type { Agenda, Lang, Organization, Speaker, Startup } from "@/lib/data"

/** JSON files live in public/data and are served as-is at /data/<file> */
const dataUrl = (file: string) => `${import.meta.env.BASE_URL}data/${file}`

interface Dataset {
  title: string
  file: string
  url: string
  icon: LucideIcon
  blurb: string
  /** turns the parsed JSON file into cards */
  toCards: (data: unknown, lang: Lang) => CardModel[]
}

export const datasets = {
  startups: {
    title: "Startups",
    file: "startups_list.json",
    url: dataUrl("startups_list.json"),
    icon: RocketIcon,
    blurb: "Startups from HITEX 2022–2026, with founders and descriptions.",
    toCards: (data, lang) => (data as Startup[]).map((s) => startupCard(s, lang)),
  },
  exhibitors: {
    title: "Exhibitors",
    file: "exhibitors.json",
    url: dataUrl("exhibitors.json"),
    icon: BuildingIcon,
    blurb: "Exhibitors with tier, booth, country, sector and website.",
    toCards: (data, lang) => (data as Organization[]).map((o) => organizationCard(o, lang)),
  },
  sponsors: {
    title: "Sponsors",
    file: "sponsors.json",
    url: dataUrl("sponsors.json"),
    icon: HandshakeIcon,
    blurb: "Sponsors and partners with tier, booth and website.",
    toCards: (data, lang) => (data as Organization[]).map((o) => organizationCard(o, lang)),
  },
  media: {
    title: "Media",
    file: "media.json",
    url: dataUrl("media.json"),
    icon: NewspaperIcon,
    blurb: "Media outlets covering HITEX.",
    toCards: (data, lang) => (data as Organization[]).map((o) => organizationCard(o, lang)),
  },
  speakers: {
    title: "Speakers",
    file: "speakers.json",
    url: dataUrl("speakers.json"),
    icon: MicIcon,
    blurb: "Conference speakers 2022–2026, with roles and bios.",
    toCards: (data, lang) => orderSpeakers(data as Speaker[]).map((s) => speakerCard(s, lang)),
  },
  agenda: {
    title: "Agenda",
    file: "agenda.json",
    url: dataUrl("agenda.json"),
    icon: CalendarIcon,
    blurb: "HITEX 2026 conference sessions by day, with speakers.",
    toCards: (data, lang) => agendaCards(data as Agenda, lang),
  },
} satisfies Record<string, Dataset>

export type DatasetKey = keyof typeof datasets

export const datasetKeys = Object.keys(datasets) as DatasetKey[]

export async function loadDataset(key: DatasetKey): Promise<unknown> {
  const res = await fetch(datasets[key].url)
  if (!res.ok) throw new Error(`${datasets[key].file}: HTTP ${res.status}`)
  return res.json()
}
