// Runs after `vite build`. For every startup profile it writes
//   dist/startups/<slug>/index.html  the app's page with the startup's own title, description and preview
//   dist/og/<slug>.png               the 1200×630 preview image
// so a shared https://hitex2026.netlify.app/startups/<slug> link shows the startup on LinkedIn, WhatsApp,
// Telegram and the like (their crawlers don't run JavaScript). People who open it get the app, which
// shows the profile. Also writes dist/_redirects so Netlify serves those pages without a trailing slash.
// Uses only files in the repo: no network.
import fs from "node:fs"
import path from "node:path"

import { Resvg } from "@resvg/resvg-js"

import { SITE_URL, profileUrl } from "../src/lib/links.ts"
import { ROOT, type Profile, type Vocab } from "./lib/profiles.ts"

const DIST = path.join(ROOT, "dist")
const FONTS = path.join(ROOT, "scripts/og/fonts")
const W = 1200
const H = 630

const community = JSON.parse(fs.readFileSync(path.join(DIST, "data/community.json"), "utf8")) as {
  vocab: Vocab
  profiles: Profile[]
}
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

function page(p: Profile, title: string, description: string) {
  const url = profileUrl(p.slug)
  const image = `${SITE_URL}/og/${p.slug}.png`
  let html = template
  html = replace(html, /(<title>)[^<]*(<\/title>)/, title)
  html = replace(html, /(<meta name="description" content=")[^"]*(")/, description)
  html = replace(html, /(<meta property="og:title" content=")[^"]*(")/, title)
  html = replace(html, /(<meta property="og:description" content=")[^"]*(")/, description)
  html = replace(html, /(<meta property="og:url" content=")[^"]*(")/, url)
  html = replace(html, /(<meta property="og:image" content=")[^"]*(")/, image)
  return html.replace("</head>", `  <link rel="canonical" href="${escape(url)}" />\n  </head>`)
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
  const chips = [...(hiring ? [{ text: "Hiring now", red: true }] : []), ...[industry, label("stages", p.stage), city].filter(Boolean).map((text) => ({ text, red: false }))]

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
    .map(({ text, red }) => {
      const w = textWidth(text, 26) + 40
      if (chipX + w > W - 60) return ""
      const out =
        `<rect x="${chipX}" y="${chipY}" width="${w}" height="50" rx="25" fill="${red ? "#EB2637" : "#26262b"}" />` +
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
  <text x="80" y="560" font-size="28" fill="#8e8e93">${escape(profileUrl(p.slug).replace("https://", ""))}</text>
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

fs.mkdirSync(path.join(DIST, "og"), { recursive: true })
// Netlify: serve each page at /startups/<slug> as well as /startups/<slug>/, whatever its trailing-slash setting
const redirects = ["# written by scripts/build-share-pages.ts"]
for (const p of community.profiles) {
  redirects.push(`/startups/${p.slug}  /startups/${p.slug}/index.html  200`)
  const en = p.i18n.en
  const title = `${en.name} · HITEX Explorer`
  const description = shorten([en.tagline, en.description].filter(Boolean).join(" — ").replace(/\s+/g, " "), 200)
  const dir = path.join(DIST, "startups", p.slug)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, "index.html"), page(p, title, description))
  fs.writeFileSync(path.join(DIST, "og", `${p.slug}.png`), previewPng(p))
}
fs.writeFileSync(path.join(DIST, "_redirects"), redirects.join("\n") + "\n")
console.log(`✓ ${community.profiles.length} share page(s) with preview images in dist/startups/ and dist/og/.`)
