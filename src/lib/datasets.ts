import { BuildingIcon, CalendarIcon, HandshakeIcon, MicIcon, NewspaperIcon, RocketIcon, type LucideIcon } from "lucide-react"

import { agendaCards, orderSpeakers, organizationCard, speakerCard, sponsorCards, startupCards, type CardModel } from "@/lib/cards"
import { loadCommunity, type CommunityData } from "@/lib/community"
import type { Agenda, Lang, Organization, Speaker, Startup } from "@/lib/data"
import { dataUrl, fetchData, once, peek } from "@/lib/data-files"

interface Dataset {
  title: string
  file: string
  url: string
  icon: LucideIcon
  blurb: string
  /** custom loader when a page combines several files; defaults to fetching `url` */
  load?: () => Promise<unknown>
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
    // HITEX startups plus the profiles contributed through public/startups/*.yml
    load: async () => {
      const [hitex, community] = await Promise.all([fetchData("startups_list.json"), loadCommunity()])
      return { hitex, community }
    },
    toCards: (data, lang) => startupCards(data as { hitex: Startup[]; community: CommunityData }, lang),
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
    // HITEX sponsors plus the profiles contributed through public/sponsors/*.yml
    load: async () => {
      const [hitex, community] = await Promise.all([fetchData("sponsors.json"), loadCommunity()])
      return { hitex, community }
    },
    toCards: (data, lang) => sponsorCards(data as { hitex: Organization[]; community: CommunityData }, lang),
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

/** A dataset's data, loaded once per visit (see data-files.ts). */
export function loadDataset(key: DatasetKey): Promise<unknown> {
  const d: Dataset = datasets[key]
  return once(`dataset:${key}`, () => (d.load ? d.load() : fetchData(d.file)))
}

/** The dataset's data if it is already loaded, so its page can render at once. */
export const peekDataset = (key: DatasetKey) => peek<unknown>(`dataset:${key}`)
