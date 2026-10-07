// The site's pages: clean addresses, titles and descriptions. Used by the app (tab titles) and by
// scripts/build-share-pages.ts (each section's own page for search engines), so no imports here.

export const SITE_URL = "https://hitex2026.netlify.app"
/** the site's title in search results and the browser tab */
export const SITE_TITLE = "HITEX Explorer 2026 | The Ultra Tool for HITEX Exhibition"

export type SectionKey =
  | "startups"
  | "jobs"
  | "exhibitors"
  | "sponsors"
  | "media"
  | "speakers"
  | "agenda"
  | "contribution"
  | "contribution/startup"
  | "contribution/sponsor"
  | "about"

export const SECTIONS: Record<SectionKey, { title: string; description: string }> = {
  startups: {
    title: "HITEX 2026 Startups | HITEX Explorer",
    description:
      "Every startup HITEX lists, 2022–2026, with founders and descriptions in English, Arabic, Kurdish and Persian. Startups with a full profile show their team, products and open jobs.",
  },
  jobs: {
    title: "Jobs at HITEX Startups and Sponsors | HITEX Explorer",
    description:
      "Open positions at HITEX startups and sponsors, with salaries in USD and IQD, the experience and skills they need, and how to apply.",
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
    title: "Contribute to HITEX Explorer | Startups and Sponsors",
    description:
      "Took part in HITEX as a startup or a sponsor? Give your organization a full page on HITEX Explorer: your story, team, offers and open jobs, in four languages.",
  },
  "contribution/startup": {
    title: "Add Your Startup's Profile | HITEX Explorer",
    description:
      "Took part in HITEX? Complete your startup's profile on HITEX Explorer for free: your story, team, products and open jobs, in four languages.",
  },
  "contribution/sponsor": {
    title: "Add Your Sponsor Profile | HITEX Explorer",
    description:
      "Proud sponsor of HITEX 2026? Show startups and talent what you offer: partnership programs, pilots, your booth, leadership and open jobs, in four languages.",
  },
  about: {
    title: "About | HITEX Explorer",
    description: "About HITEX Explorer, an independent explorer for HITEX 2026 built on HITEX's public data.",
  },
}

export const SECTION_KEYS = Object.keys(SECTIONS) as SectionKey[]

/** A section's address. Netlify serves each page from a folder, at the address ending with / */
export const sectionPath = (key: SectionKey) => `/${key}/`
