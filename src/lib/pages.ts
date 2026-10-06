// The site's pages: clean addresses, titles and descriptions. Used by the app (tab titles) and by
// scripts/build-share-pages.ts (each section's own page for search engines), so no imports here.

export const SITE_URL = "https://hitex2026.netlify.app"
/** the site's title in search results and the browser tab */
export const SITE_TITLE = "HITEX Explorer 2026 | The Ultra Tool for HITEX Exhibition"

export type SectionKey = "startups" | "jobs" | "exhibitors" | "sponsors" | "media" | "speakers" | "agenda" | "contribution" | "about"

export const SECTIONS: Record<SectionKey, { title: string; description: string }> = {
  startups: {
    title: "HITEX 2026 Startups | HITEX Explorer",
    description:
      "Every startup HITEX lists, 2022–2026, with founders and descriptions in English, Arabic, Kurdish and Persian. Startups with a full profile show their team, products and open jobs.",
  },
  jobs: {
    title: "Jobs at HITEX Startups | HITEX Explorer",
    description: "Open positions at HITEX startups, with salaries in USD and IQD, the experience and skills they need, and how to apply.",
  },
  exhibitors: {
    title: "HITEX 2026 Exhibitors and Booths | HITEX Explorer",
    description: "All HITEX 2026 exhibitors with their booth numbers, country, sector and website.",
  },
  sponsors: {
    title: "HITEX 2026 Sponsors | HITEX Explorer",
    description: "HITEX 2026 sponsors and partners, with their tier, booth and website.",
  },
  media: {
    title: "HITEX 2026 Media | HITEX Explorer",
    description: "The media outlets covering HITEX 2026.",
  },
  speakers: {
    title: "HITEX 2026 Speakers | HITEX Explorer",
    description: "HITEX 2026 conference speakers with their roles, companies and bios.",
  },
  agenda: {
    title: "HITEX 2026 Agenda | HITEX Explorer",
    description: "The HITEX 2026 agenda, 6–9 October 2026 at Erbil International Fairground: the sessions of each day, with their speakers.",
  },
  contribution: {
    title: "Add Your Startup's Profile | HITEX Explorer",
    description:
      "Took part in HITEX? Complete your startup's profile on HITEX Explorer for free: your story, team, products and open jobs, in four languages.",
  },
  about: {
    title: "About | HITEX Explorer",
    description: "About HITEX Explorer, an independent explorer for HITEX 2026 built on HITEX's public data.",
  },
}

export const SECTION_KEYS = Object.keys(SECTIONS) as SectionKey[]
