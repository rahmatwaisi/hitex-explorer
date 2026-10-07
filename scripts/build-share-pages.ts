// Runs after `vite build`. For every section of the app (/startups/, /jobs/, /exhibitors/…) it writes
//   dist/<section>/index.html        the app's page with the section's own title, description, canonical
//                                    address, structured data and a plain-text list of its content
// For every startup profile it writes
//   dist/startups/<slug>/index.html  the app's page with the startup's own title, description, preview,
//                                    structured data and a plain-text summary
//   dist/og/<slug>.png               the 1200×630 preview image
// and the same for every sponsor profile, at dist/sponsors/<slug>/index.html and dist/og/sponsors/<slug>.png
// so a shared https://hitex2026.netlify.app/startups/<slug>/ link shows the startup on LinkedIn, WhatsApp,
// Telegram and the like, and search engines and AI tools can read it (their crawlers often don't run
// JavaScript). People who open it get the app, which shows the profile. Pages live in folders, so their
// addresses end with / (Netlify redirects /jobs to /jobs/); canonical links, the sitemap and the app
// use that form. It also writes
//   dist/sitemap.xml   the home page, the sections and every profile page, for search engines
//   dist/llms.txt      a short guide to the site for AI tools
// and lists the profiles in the home page's plain-text summary. Uses only files in the repo: no network.
import fs from "node:fs"
import path from "node:path"

import { Resvg } from "@resvg/resvg-js"

import { SITE_URL, isOnThisSite, profileUrl, sponsorUrl } from "../src/lib/links.ts"
import { SECTIONS, SECTION_KEYS, sectionPath, type SectionKey } from "../src/lib/pages.ts"
import { ROOT, type Profile, type Vocab } from "./lib/profiles.ts"

const DIST = path.join(ROOT, "dist")
const FONTS = path.join(ROOT, "scripts/og/fonts")
const W = 1200
const H = 630

const community = JSON.parse(fs.readFileSync(path.join(DIST, "data/community.json"), "utf8")) as {
  vocab: Vocab
  profiles: Profile[]
  sponsors?: Profile[]
}
const sponsors = community.sponsors ?? []
const isSponsor = (p: Profile) => p.kind === "sponsor"
/** a profile's page: /startups/<slug>/ or /sponsors/<slug>/ */
const urlOf = (p: Profile) => (isSponsor(p) ? sponsorUrl(p.slug) : profileUrl(p.slug))
const tierText = (tier: string | undefined) => (tier ? `${tier[0].toUpperCase()}${tier.slice(1)} sponsor` : "HITEX sponsor")
const template = fs.readFileSync(path.join(DIST, "index.html"), "utf8")
const logo = `data:image/png;base64,${fs.readFileSync(path.join(ROOT, "public/brand/logo-dark.png")).toString("base64")}`

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
const label = (list: string, key: string | undefined) => {
  const entry = key ? community.vocab[list]?.[key] : undefined
  return entry && typeof entry === "object" ? (entry.en ?? key ?? "") : (key ?? "")
}
const shorten = (s: string, max: number) => (s.length <= max ? s : `${s.slice(0, max - 1).replace(/\s+\S*$/, "")}…`)

/** Replaces one tag's content in the page; fails the build if the tag isn't there (index.html changed). */
function replace(html: string, re: RegExp, value: string) {
  if (!re.test(html)) throw new Error(`build-share-pages: ${re} not found in dist/index.html`)
  return html.replace(re, (_, before: string, after: string) => `${before}${escape(value)}${after}`)
}

/** Replaces everything between two markers (kept) in the page; fails the build if they're missing. */
function between(html: string, start: string, end: string, content: string) {
  const a = html.indexOf(start)
  const b = html.indexOf(end, a)
  if (a < 0 || b < 0) throw new Error(`build-share-pages: ${start} … ${end} not found in dist/index.html`)
  return html.slice(0, a + start.length) + content + html.slice(b)
}

/** JSON inside <script>: `<` escaped so text can't close the tag */
const jsonScript = (data: unknown) =>
  `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`

const city = (p: Profile) => (p.location?.city === "other" ? (p.location.city_other ?? "") : label("cities", p.location?.city))
const industry = (p: Profile) => (p.industry === "other" ? (p.industry_other ?? "") : label("industries", p.industry))
const website = (p: Profile) => (isOnThisSite(p.website) ? "" : (p.website as string | undefined) ?? "")

/** schema.org: a profile page about the startup or sponsor, part of HITEX Explorer */
function profileData(p: Profile, url: string, description: string) {
  const en = p.i18n.en
  const sameAs = [website(p), ...Object.values(p.links ?? {})].filter((u): u is string => typeof u === "string" && !!u)
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url,
    name: `${en.name} · HITEX Explorer`,
    description,
    inLanguage: ["en", "ar", "ku", "fa"].filter((l) => p.i18n[l]),
    isPartOf: { "@type": "WebSite", name: "HITEX Explorer", url: `${SITE_URL}/` },
    mainEntity: {
      "@type": "Organization",
      name: en.name,
      description: en.description ?? en.tagline,
      ...(website(p) ? { url: website(p) } : {}),
      logo: p.logo_url,
      ...(p.founded ? { foundingDate: p.founded } : {}),
      address: { "@type": "PostalAddress", addressLocality: city(p), addressCountry: p.location?.country },
      ...(p.founders?.length ? { founder: p.founders.map((f: Profile) => ({ "@type": "Person", name: f.name })) } : {}),
      ...(sameAs.length ? { sameAs } : {}),
    },
  }
}

/** The profile's summary in plain HTML, in place of the home page's (for crawlers without JavaScript). */
function profileSummary(p: Profile, description: string) {
  const en = p.i18n.en
  const sponsor = isSponsor(p)
  const facts = [
    sponsor ? tierText(p.tier) : "",
    industry(p),
    sponsor ? "" : label("stages", p.stage),
    city(p),
    p.founded ? `founded ${String(p.founded).slice(0, 4)}` : "",
  ].filter(Boolean)
  const offers = sponsor ? ((p.for_startups?.offers ?? []) as string[]).map((o) => label("sponsor_offers", o)) : []
  return `
      <main class="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-16 sm:px-6">
        <h1 class="text-3xl font-semibold">${escape(en.name)}</h1>
        ${en.tagline ? `<p class="text-lg text-muted-foreground">${escape(en.tagline)}</p>` : ""}
        <p>${escape(en.description ?? description)}</p>
        <p class="text-sm text-muted-foreground">${escape(facts.join(" · "))}</p>
        ${offers.length ? `<p>For startups: ${escape(offers.join(", "))}</p>` : ""}
        ${website(p) ? `<p><a href="${escape(website(p))}">${escape(website(p))}</a></p>` : ""}
        <p class="text-sm text-muted-foreground">
          A HITEX 2026 ${sponsor ? "sponsor" : "startup"} on <a href="/">HITEX Explorer</a>, the independent explorer for HITEX 2026.
          ${sponsor ? `<a href="/sponsors/">All sponsors</a>` : `<a href="/startups/">All startups</a>`} · <a href="/jobs/">Jobs</a>
        </p>
      </main>
      `
}

/** The app's page with its own title, description, address, preview image, structured data and summary. */
function pageHtml(o: { title: string; description: string; url: string; image: string; data: unknown; summary: string; what: string }) {
  const { title, description, url, image } = o
  let html = template
  html = replace(html, /(<title>)[^<]*(<\/title>)/, title)
  html = replace(html, /(<meta name="title" content=")[^"]*(")/, title)
  html = replace(html, /(<meta name="description" content=")[^"]*(")/, description)
  html = replace(html, /(<link rel="canonical" href=")[^"]*(")/, url)
  html = replace(html, /(<meta property="og:title" content=")[^"]*(")/, title)
  html = replace(html, /(<meta property="og:description" content=")[^"]*(")/, description)
  html = replace(html, /(<meta property="og:url" content=")[^"]*(")/, url)
  html = replace(html, /(<meta property="og:image" content=")[^"]*(")/, image)
  html = replace(html, /(<meta name="twitter:url" content=")[^"]*(")/, url)
  html = replace(html, /(<meta name="twitter:title" content=")[^"]*(")/, title)
  html = replace(html, /(<meta name="twitter:description" content=")[^"]*(")/, description)
  html = replace(html, /(<meta name="twitter:image" content=")[^"]*(")/, image)
  const ld = /<script type="application\/ld\+json">[\s\S]*?<\/script>/
  if (!ld.test(html)) throw new Error("build-share-pages: structured data not found in dist/index.html")
  html = html.replace(ld, () => jsonScript(o.data))
  return between(html, "<!-- fallback:start", "<!-- fallback:end -->", ` (${o.what}) -->${o.summary}`)
}

/** og/<slug>.png for startups, og/sponsors/<slug>.png for sponsors */
const ogPath = (p: Profile) => (isSponsor(p) ? `og/sponsors/${p.slug}.png` : `og/${p.slug}.png`)

function page(p: Profile, title: string, description: string) {
  const url = urlOf(p)
  return pageHtml({
    title,
    description,
    url,
    image: `${SITE_URL}/${ogPath(p)}`,
    data: profileData(p, url, description),
    summary: profileSummary(p, description),
    what: `this ${isSponsor(p) ? "sponsor" : "startup"}'s summary`,
  })
}

// ── section pages ───────────────────────────────────────────────────────────

type Localized = Partial<Record<string, string>> | null | undefined
const en = (v: Localized) => (v?.en?.trim() || Object.values(v ?? {}).find((x) => x?.trim())?.trim() || "")
const readData = <T,>(file: string) => JSON.parse(fs.readFileSync(path.join(DIST, "data", file), "utf8")) as T
const li = (parts: (string | undefined | null | false)[], href?: string) => {
  const [first, ...rest] = parts.filter(Boolean) as string[]
  const head = href ? `<a href="${escape(href)}">${escape(first)}</a>` : escape(first)
  return `<li>${head}${rest.length ? ` · ${rest.map(escape).join(" · ")}` : ""}</li>`
}
const ul = (items: string[], empty: string) => (items.length ? `<ul>${items.join("")}</ul>` : `<p>${escape(empty)}</p>`)

/** Positions shown on profiles: hiring info under 90 days old, not "not hiring", deadline not passed (src/lib/community.ts). */
function openPositions(p: Profile) {
  const h = p.hiring
  if (!h || h.status === "not_hiring" || !h.updated) return []
  if (Date.now() - Date.parse(`${h.updated}T00:00:00Z`) > 90 * 24 * 3600 * 1000) return []
  const today = new Date().toISOString().slice(0, 10)
  return ((h.positions ?? []) as Profile[]).filter((pos) => !pos.deadline || pos.deadline >= today)
}

function salary(s: Profile | undefined) {
  if (!s || (s.type !== "range" && s.type !== "fixed") || typeof s.min !== "number") return label("salary_types", s?.type)
  const n = (x: number) => (s.currency === "USD" ? `$${x.toLocaleString("en-US")}` : `${x.toLocaleString("en-US")} ${s.currency}`)
  const amount = s.type === "range" && typeof s.max === "number" ? `${n(s.min)}–${n(s.max)}` : n(s.min)
  return s.period ? `${amount} / ${label("salary_periods", s.period)}` : amount
}

/** The plain-text content of each section, from the same data files the app shows. */
function sectionList(key: SectionKey): string {
  const profileOf = new Map(community.profiles.map((p) => [p.hitex?.existing_profile, p]))
  switch (key) {
    case "startups":
      return ul(
        readData<{ id: string; name: Localized; category: Localized; years: number[] | null }[]>("startups_list.json").map((s) => {
          const p = profileOf.get(s.id)
          return li([en(s.name), en(s.category) && `founded by ${en(s.category)}`, (s.years ?? []).join(", ")], p ? profileUrl(p.slug) : undefined)
        }),
        "No startups yet."
      )
    case "jobs":
      return ul(
        [...community.profiles, ...sponsors].flatMap((p) =>
          openPositions(p).map((pos) =>
            li([p.i18n.en.positions?.[pos.id]?.title ?? pos.id, p.i18n.en.name, label("employment", pos.employment), salary(pos.salary)], urlOf(p))
          )
        ),
        "No open positions yet. Startups and sponsors that took part in HITEX list their openings in their profile."
      )
    case "exhibitors":
    case "sponsors":
    case "media": {
      const sponsorOf = new Map(sponsors.map((p) => [p.hitex?.existing_profile, p]))
      return ul(
        readData<{ id: string; name: Localized; booth_number: string | null; tier: string | null; country: { name: Localized } | null; sector: Localized; website_url: string | null }[]>(
          `${key}.json`
        ).map((o) => {
          const p = key === "sponsors" ? sponsorOf.get(o.id) : undefined
          return li([en(o.name), o.booth_number && `booth ${o.booth_number}`, o.tier, en(o.country?.name), en(o.sector)], p ? urlOf(p) : (o.website_url ?? undefined))
        }),
        "None listed yet."
      )
    }
    case "speakers":
      return ul(
        readData<{ name: Localized; title: Localized; company: Localized }[]>("speakers.json").map((sp) => li([en(sp.name), en(sp.title), en(sp.company)])),
        "No speakers listed yet."
      )
    case "agenda": {
      const a = readData<{ agendas: { day_number: number; date: string; title: Localized; sessions: { title: Localized; start_time: string; end_time: string; speakers: { name: Localized }[] }[] }[] }>("agenda.json")
      return a.agendas
        .map(
          (d) =>
            `<h2 class="text-xl font-semibold">${escape(`Day ${d.day_number} · ${en(d.title)} · ${d.date}`)}</h2>` +
            ul(
              d.sessions.map((s) => li([`${s.start_time.slice(0, 5)}–${s.end_time.slice(0, 5)} ${en(s.title)}`, s.speakers.map((x) => en(x.name)).join(", ")])),
              "Opening ceremony."
            )
        )
        .join("")
    }
    case "contribution":
      return `<p>Startups and sponsors that took part in HITEX can give their organization a full page here. <a href="/contribution/startup/">Contribute as Startup</a> · <a href="/contribution/sponsor/">Contribute as Sponsor</a></p>`
    case "contribution/startup":
      return `<p>Find your startup in HITEX's list, answer a few questions in the <a href="/contribution/form">profile form</a> (what HITEX publishes is filled in for you), then submit it on GitHub or send it without GitHub. It's free for every startup HITEX lists.</p>`
    case "contribution/sponsor":
      return `<p>Find your organization in HITEX's list of sponsors, answer a few questions in the <a href="/contribution/sponsor/form">sponsor profile form</a> (what HITEX publishes is filled in for you), then submit it on GitHub or send it without GitHub. Show startups what you offer, the partners you're looking for, your leadership and the roles you're hiring for.</p>`
    case "about":
      return `<p>HITEX Explorer is an independent project by Rahmat Waisi, built on HITEX's public data. It is not affiliated with HITEX (<a href="https://hitex.tech/en">hitex.tech</a>).</p>`
  }
}

function sectionPage(key: SectionKey) {
  const { title, description } = SECTIONS[key]
  const url = `${SITE_URL}${sectionPath(key)}`
  const heading = title.replace(/ \| HITEX Explorer$/, "")
  const nav = SECTION_KEYS.filter((k) => k !== key)
    .map((k) => `<a href="${sectionPath(k)}">${escape(SECTIONS[k].title.replace(/ \| HITEX Explorer$/, ""))}</a>`)
    .join(" · ")
  return pageHtml({
    title,
    description,
    url,
    image: `${SITE_URL}/brand/og-image.png`,
    what: "this section's content",
    data: {
      "@context": "https://schema.org",
      "@type": key === "about" || key.startsWith("contribution") ? "WebPage" : "CollectionPage",
      name: title,
      url,
      description,
      inLanguage: ["en", "ar", "ku", "fa"],
      isPartOf: { "@type": "WebSite", name: "HITEX Explorer", url: `${SITE_URL}/` },
      about: {
        "@type": "Event",
        name: "HITEX 2026 Technology Exhibition",
        startDate: "2026-10-06",
        endDate: "2026-10-09",
        location: { "@type": "Place", name: "Erbil International Fairground" },
      },
    },
    summary: `
      <main class="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-16 sm:px-6">
        <h1 class="text-3xl font-semibold">${escape(heading)}</h1>
        <p class="text-muted-foreground">${escape(description)}</p>
        ${sectionList(key)}
        <p class="text-sm text-muted-foreground"><a href="/">HITEX Explorer</a> · ${nav}</p>
      </main>
      `,
  })
}

// ── preview image ───────────────────────────────────────────────────────────

/** Splits text into at most `lines` lines of about `chars` characters, ending with … when cut. */
function wrap(text: string, chars: number, lines: number) {
  const out: string[] = []
  let line = ""
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (line && (line + " " + word).length > chars) {
      out.push(line)
      line = word
    } else line = line ? `${line} ${word}` : word
  }
  if (line) out.push(line)
  if (out.length > lines) {
    out.length = lines
    out[lines - 1] = shorten(`${out[lines - 1]} …`, chars).replace(/\s*…?$/, "…")
  }
  return out
}

// the hues of the site's letter tiles (src/lib/cards.ts)
const HUES = [25, 55, 95, 145, 185, 215, 260, 290, 320, 350]
function hue(id: string) {
  let hash = 0
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return HUES[hash % HUES.length]
}

/** Rough width of a text in this font, for laying out the chips. */
const textWidth = (text: string, size: number) => text.length * size * 0.56

function previewSvg(p: Profile) {
  const sponsor = isSponsor(p)
  const name = p.i18n.en.name as string
  const tagline = (p.i18n.en.tagline as string | undefined) ?? ""
  const letter = name.match(/[\p{L}\p{N}]/u)?.[0]?.toLocaleUpperCase() ?? "?"
  const h = hue(p.slug)
  const nameLines = wrap(name, 22, 2)
  const nameSize = nameLines.length > 1 ? 60 : 72
  const taglineLines = wrap(tagline, 46, 2)

  const city = p.location?.city === "other" ? (p.location.city_other ?? "") : label("cities", p.location?.city)
  const industry = p.industry === "other" ? (p.industry_other ?? "") : label("industries", p.industry)
  const updated = p.hiring?.updated ? Date.parse(`${p.hiring.updated}T00:00:00Z`) : 0
  const hiring = p.hiring && p.hiring.status !== "not_hiring" && Date.now() - updated <= 90 * 24 * 3600 * 1000
  const chips = [
    ...(sponsor ? [{ text: tierText(p.tier), fill: "#2b3f86" }] : []),
    ...(hiring ? [{ text: "Hiring now", fill: "#EB2637" }] : []),
    ...[industry, sponsor ? "" : label("stages", p.stage), city].filter(Boolean).map((text) => ({ text, fill: "#26262b" })),
  ]

  const textX = 330
  let y = 230
  const nameSvg = nameLines
    .map((line) => {
      const out = `<text x="${textX}" y="${y}" font-size="${nameSize}" font-weight="700" fill="#fff">${escape(line)}</text>`
      y += nameSize * 1.1
      return out
    })
    .join("")
  y += 8
  const taglineSvg = taglineLines
    .map((line) => {
      const out = `<text x="${textX}" y="${y}" font-size="34" fill="#c7c7cc">${escape(line)}</text>`
      y += 44
      return out
    })
    .join("")

  let chipX = textX
  const chipY = Math.max(y + 18, 420)
  const chipsSvg = chips
    .map(({ text, fill }) => {
      const w = textWidth(text, 26) + 40
      if (chipX + w > W - 60) return ""
      const out =
        `<rect x="${chipX}" y="${chipY}" width="${w}" height="50" rx="25" fill="${fill}" />` +
        `<text x="${chipX + w / 2}" y="${chipY + 34}" font-size="26" font-weight="700" text-anchor="middle" fill="#fff">${escape(text)}</text>`
      chipX += w + 14
      return out
    })
    .join("")

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Google Sans Flex">
  <defs>
    <radialGradient id="bg" cx="0.3" cy="0.2" r="1">
      <stop offset="0" stop-color="#1d1d21" />
      <stop offset="1" stop-color="#09090b" />
    </radialGradient>
    <linearGradient id="neon" x1="0" x2="1">
      <stop offset="0" stop-color="#39ff14" /><stop offset="0.25" stop-color="#00e5ff" />
      <stop offset="0.5" stop-color="#2979ff" /><stop offset="0.75" stop-color="#b026ff" /><stop offset="1" stop-color="#ff2bd6" />
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)" />
  <image href="${logo}" x="80" y="64" width="330" height="45" />
  <rect x="80" y="170" width="210" height="210" rx="44" fill="hsl(${h} 45% 22%)" stroke="hsl(${h} 70% 70%)" stroke-opacity="0.25" stroke-width="2" />
  <text x="185" y="315" font-size="120" font-weight="700" text-anchor="middle" fill="hsl(${h} 85% 82%)">${escape(letter)}</text>
  ${nameSvg}
  ${taglineSvg}
  ${chipsSvg}
  <text x="80" y="560" font-size="28" fill="#8e8e93">${escape(urlOf(p).replace("https://", ""))}</text>
  <rect y="${H - 10}" width="${W}" height="10" fill="url(#neon)" />
</svg>`
}

function previewPng(p: Profile) {
  const resvg = new Resvg(previewSvg(p), {
    font: {
      fontFiles: [path.join(FONTS, "GoogleSansFlex-Regular.ttf"), path.join(FONTS, "GoogleSansFlex-Bold.ttf")],
      // other scripts in a name fall back to whatever the build machine has
      loadSystemFonts: true,
      defaultFontFamily: "Google Sans Flex",
    },
  })
  return resvg.render().asPng()
}

// ── write ───────────────────────────────────────────────────────────────────

fs.mkdirSync(path.join(DIST, "og", "sponsors"), { recursive: true })
for (const p of [...community.profiles, ...sponsors]) {
  const en = p.i18n.en
  const title = `${en.name} · HITEX Explorer`
  const description = shorten([en.tagline, en.description].filter(Boolean).join(" — ").replace(/\s+/g, " "), 200)
  const dir = path.join(DIST, isSponsor(p) ? "sponsors" : "startups", p.slug)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, "index.html"), page(p, title, description))
  fs.writeFileSync(path.join(DIST, ogPath(p)), previewPng(p))
}
for (const key of SECTION_KEYS) {
  fs.mkdirSync(path.join(DIST, key), { recursive: true })
  fs.writeFileSync(path.join(DIST, key, "index.html"), sectionPage(key))
}

// the home page's plain-text summary lists the profiles
const summaryOf = (p: Profile) => ({ name: p.i18n.en.name as string, tagline: (p.i18n.en.tagline as string) ?? "", url: urlOf(p) })
const profiles = community.profiles.map(summaryOf)
const sponsorProfiles = sponsors.map(summaryOf)
const listSection = (heading: string, list: typeof profiles) =>
  list.length
    ? `<section><h2 class="text-xl font-semibold">${heading}</h2><ul>${list
        .map((p) => `<li><a href="${escape(p.url)}">${escape(p.name)}</a>${p.tagline ? ` · ${escape(p.tagline)}` : ""}</li>`)
        .join("")}</ul></section>`
    : ""
if (profiles.length || sponsorProfiles.length) {
  if (!template.includes("<!-- startup-profiles -->")) throw new Error("build-share-pages: <!-- startup-profiles --> not found in dist/index.html")
  fs.writeFileSync(
    path.join(DIST, "index.html"),
    template.replace("<!-- startup-profiles -->", listSection("Startup profiles", profiles) + listSection("Sponsor profiles", sponsorProfiles))
  )
}

// sitemap: the home page, the sections and the profile pages
const today = new Date().toISOString().slice(0, 10)
const urls = [
  { loc: `${SITE_URL}/`, changefreq: "daily", priority: "1.0" },
  ...SECTION_KEYS.map((k) => ({ loc: `${SITE_URL}${sectionPath(k)}`, changefreq: k === "about" ? "monthly" : "daily", priority: k === "about" ? "0.3" : "0.9" })),
  ...[...profiles, ...sponsorProfiles].map((p) => ({ loc: p.url, changefreq: "weekly", priority: "0.8" })),
]
fs.writeFileSync(
  path.join(DIST, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>\n    <loc>${escape(u.loc)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`).join("\n")}
</urlset>
`
)

// llms.txt (https://llmstxt.org): what the site is, where things are, and the open data files
const sections: [string, string, string][] = [
  ["Startups", "startups", "every startup HITEX lists (2022–2026), with founders and descriptions; those with a full profile link to it"],
  ["Jobs", "jobs", "open positions at HITEX startups and sponsors, with salaries in USD and IQD"],
  ["Exhibitors", "exhibitors", "exhibitors with tier, booth number, country, sector and website"],
  ["Sponsors", "sponsors", "sponsors and partners; those with a full profile link to it"],
  ["Media", "media", "media outlets covering HITEX"],
  ["Speakers", "speakers", "conference speakers with roles and bios"],
  ["Agenda", "agenda", "HITEX 2026 sessions by day, with speakers"],
  ["Contribute as Startup", "contribution/startup", "how a HITEX startup completes its profile"],
  ["Contribute as Sponsor", "contribution/sponsor", "how a HITEX sponsor completes its profile: offers to startups, leadership and jobs"],
]
const files: [string, string][] = [
  ["startups_list.json", "HITEX startups"],
  ["community.json", "completed startup profiles (team, products, hiring, funding) and sponsor profiles (offers to startups, leadership, hiring)"],
  ["exhibitors.json", "exhibitors"],
  ["sponsors.json", "sponsors"],
  ["media.json", "media"],
  ["speakers.json", "speakers"],
  ["agenda.json", "agenda"],
]
fs.writeFileSync(
  path.join(DIST, "llms.txt"),
  `# HITEX Explorer

> The ultimate third-party explorer for HITEX 2026, the technology exhibition held 6–9 October 2026 at Erbil International Fairground, Kurdistan Region of Iraq. Search startups, exhibitors and their booths, sponsors, media, speakers, the agenda and jobs, in English, Arabic, Kurdish and Persian. An independent project by Rahmat Waisi, built on HITEX's public data; not affiliated with HITEX (https://hitex.tech/en).

Every section and every startup and sponsor profile has its own page, listed below. Texts exist in English (en), Arabic (ar), Kurdish Sorani (ku) and Persian (fa).

## Sections

${sections.map(([name, key, what]) => `- [${name}](${SITE_URL}${sectionPath(key as SectionKey)}): ${what}`).join("\n")}

## Data (JSON, multilingual)

${files.map(([file, what]) => `- [${file}](${SITE_URL}/data/${file}): ${what}`).join("\n")}

## Startup profiles

${profiles.length ? profiles.map((p) => `- [${p.name}](${p.url})${p.tagline ? `: ${p.tagline}` : ""}`).join("\n") : "None yet."}

## Sponsor profiles

${sponsorProfiles.length ? sponsorProfiles.map((p) => `- [${p.name}](${p.url})${p.tagline ? `: ${p.tagline}` : ""}`).join("\n") : "None yet."}
`
)
console.log(
  `✓ ${SECTION_KEYS.length} section pages, ${community.profiles.length} startup and ${sponsors.length} sponsor profile page(s) with preview images; sitemap.xml and llms.txt written.`
)
