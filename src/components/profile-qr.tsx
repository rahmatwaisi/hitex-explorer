import { useMemo, useRef, useState } from "react"
import { CheckIcon, DownloadIcon, LinkIcon, Loader2Icon, ScanQrCodeIcon, Share2Icon } from "lucide-react"
import { encode } from "uqr"

import { LinkedInIcon, TelegramIcon, WhatsAppIcon } from "@/components/brand-icons"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { Lang } from "@/lib/data"
import { profileUrl } from "@/lib/links"

/**
 * Colors and center icon of the code, fixed (not theme variables) so downloads look the same: dark
 * modules on white in both themes, since phone cameras need dark on light. Startups: near-black with
 * HITEX red finder rings and the red icon; sponsors: deep navy with brighter navy rings (14.8:1 and
 * 7.3:1 on white) and the icon recolored to the sponsor navy (#1B387B).
 */
const STYLES = {
  startup: { ink: "#111114", ring: "#EB2637", icon: `${import.meta.env.BASE_URL}brand/apple-touch-icon.png` },
  sponsor: { ink: "#0E2459", ring: "#2E52A5", icon: `${import.meta.env.BASE_URL}brand/apple-touch-icon-navy.png` },
}
/** white margin around the code, in modules (the QR spec asks for 4) */
const QUIET = 4
/** width and height of a downloaded file, in pixels */
const FILE_SIZE = 1024
const XLINK = "http://www.w3.org/1999/xlink"

/**
 * A QR code of the startup's (or sponsor's) page on this site, for visitors to scan at its HITEX booth,
 * with SVG (print) and PNG downloads. Renders nothing while the profile has no slug.
 */
export function ProfileQr({
  slug,
  name,
  lang,
  url = profileUrl(slug),
  kind = "startup",
}: {
  slug: string
  name: string
  lang?: Lang
  /** the page the code opens; a startup's page by default */
  url?: string
  /** the code's colors, and "this startup" / "this sponsor" while the name is empty */
  kind?: "startup" | "sponsor"
}) {
  const { ink, ring, icon } = STYLES[kind]
  const svgRef = useRef<SVGSVGElement>(null)
  const [busy, setBusy] = useState<"svg" | "png" | null>(null)
  const qr = useMemo(() => (slug ? qrShapes(url) : null), [slug, url])
  if (!qr) return null

  const download = async (kind: "svg" | "png") => {
    if (!svgRef.current || busy) return
    setBusy(kind)
    try {
      const svg = await svgFile(svgRef.current, icon)
      const png = kind === "png" ? await pngFile(svg).catch(() => null) : null
      // a browser that won't draw the SVG on a canvas still gets the SVG
      if (png) save(`${slug}-qr.png`, png)
      else save(`${slug}-qr.svg`, new Blob([svg], { type: "image/svg+xml;charset=utf-8" }))
    } finally {
      setBusy(null)
    }
  }

  const { total, hole } = qr
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-6 sm:flex-row">
        {/* rounded white tile; the SVG itself stays square so a download is white to the edges */}
        <div className="size-48 shrink-0 overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-black/10 sm:size-56">
          <svg ref={svgRef} viewBox={`0 0 ${total} ${total}`} role="img" aria-label={`QR code for ${url}`} className="block size-full">
            <rect width={total} height={total} fill="#fff" />
            <path d={qr.modules} fill={ink} />
            {qr.finders.map(([x, y]) => (
              <g key={`${x},${y}`}>
                <rect x={x + 0.5} y={y + 0.5} width={6} height={6} rx={1.75} fill="none" stroke={ring} strokeWidth={1} />
                <rect x={x + 2} y={y + 2} width={3} height={3} rx={0.9} fill={ink} />
              </g>
            ))}
            <image href={icon} x={hole.at + 0.6} y={hole.at + 0.6} width={hole.size - 1.2} height={hole.size - 1.2} />
          </svg>
        </div>
        <div className="flex min-w-0 flex-1 flex-col items-center gap-3 text-center sm:items-start sm:text-start">
          <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <ScanQrCodeIcon className="size-4" style={{ color: ring }} /> Open on your phone
          </p>
          <p className="text-xl font-semibold text-balance sm:text-2xl">
            Scan to see <bdi lang={lang}>{name || `this ${kind}`}</bdi> at a glance
          </p>
          <p className="max-w-prose text-muted-foreground">Point your phone camera at the code to open this page.</p>
          <p dir="ltr" className="font-mono text-xs break-all text-muted-foreground">
            {url.replace("https://", "")}
          </p>
          <ShareLinks url={url} name={name} />
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <Button size="sm" variant="outline" onClick={() => download("svg")} disabled={!!busy} title="SVG: sharp at any print size">
              {busy === "svg" ? <Loader2Icon data-icon="inline-start" className="animate-spin" /> : <DownloadIcon data-icon="inline-start" />}
              Download QR
            </Button>
            <Button size="sm" variant="outline" onClick={() => download("png")} disabled={!!busy} title={`PNG: ${FILE_SIZE} × ${FILE_SIZE} pixels`}>
              {busy === "png" ? <Loader2Icon data-icon="inline-start" className="animate-spin" /> : <DownloadIcon data-icon="inline-start" />}
              PNG
            </Button>
            <span className="text-xs text-muted-foreground">SVG for print, PNG for screens</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/** Copy the profile's address, the phone's share sheet, and WhatsApp / Telegram / LinkedIn. */
function ShareLinks({ url, name }: { url: string; name: string }) {
  const [copied, setCopied] = useState(false)
  const text = name ? `${name} on HITEX Explorer` : "On HITEX Explorer"
  const copy = () =>
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      })
      .catch(() => {})
  const canShare = typeof navigator !== "undefined" && "share" in navigator
  const u = encodeURIComponent(url)
  const t = encodeURIComponent(text)
  const sites: [string, string, typeof WhatsAppIcon, string][] = [
    ["WhatsApp", `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, WhatsAppIcon, "text-[#25D366]"],
    ["Telegram", `https://t.me/share/url?url=${u}&text=${t}`, TelegramIcon, "text-[#26A5E4]"],
    ["LinkedIn", `https://www.linkedin.com/sharing/share-offsite/?url=${u}`, LinkedInIcon, "text-[#0A66C2] dark:text-[#4c9be8]"],
  ]
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
      <Button size="sm" onClick={copy}>
        {copied ? <CheckIcon data-icon="inline-start" /> : <LinkIcon data-icon="inline-start" />}
        {copied ? "Copied" : "Copy link"}
      </Button>
      {canShare && (
        <Button size="sm" variant="outline" onClick={() => navigator.share({ title: text, url }).catch(() => {})}>
          <Share2Icon data-icon="inline-start" /> Share
        </Button>
      )}
      {sites.map(([label, href, Icon, color]) => (
        <Button key={label} size="icon-sm" variant="outline" asChild>
          <a href={href} target="_blank" rel="noreferrer" aria-label={`Share on ${label}`} title={`Share on ${label}`}>
            <Icon className={`size-4 ${color}`} />
          </a>
        </Button>
      ))}
    </div>
  )
}

/**
 * The code in SVG units (one per module, quiet zone included): data modules as one path, the three
 * finder patterns drawn separately (rounded, in the accent color), and a clear square in the center for the icon.
 * Error correction H recovers up to 30% of the code; the icon covers about 7%.
 */
function qrShapes(text: string) {
  const { data, size } = encode(text, { ecc: "H", border: 0 })
  const span = Math.round(size * 0.24)
  const holeSize = span % 2 ? span : span + 1 // odd, so it sits on the grid in the middle of an odd-sized code
  const holeAt = (size - holeSize) / 2
  const finders = [
    [0, 0],
    [size - 7, 0],
    [0, size - 7],
  ]
  const skip = (x: number, y: number) =>
    (x >= holeAt && x < holeAt + holeSize && y >= holeAt && y < holeAt + holeSize) ||
    finders.some(([fx, fy]) => x >= fx && x < fx + 7 && y >= fy && y < fy + 7)
  const dark = (x: number, y: number) => x < size && data[y][x] && !skip(x, y)

  // horizontal runs of dark modules; one path, so neighbors join without hairline seams
  let modules = ""
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!dark(x, y)) continue
      let run = 1
      while (dark(x + run, y)) run++
      modules += `M${x + QUIET} ${y + QUIET}h${run}v1h-${run}z`
      x += run
    }
  }
  return {
    total: size + 2 * QUIET,
    modules,
    finders: finders.map(([x, y]) => [x + QUIET, y + QUIET]),
    hole: { at: holeAt + QUIET, size: holeSize },
  }
}

const icons = new Map<string, Promise<string | null>>()
/** A HITEX icon as a data URL (fetched once), so downloads show it offline; null when it can't be read. */
function iconDataUrl(url: string) {
  let icon = icons.get(url)
  if (icon) return icon
  icon = fetch(url)
    .then((res) => (res.ok ? res.blob() : Promise.reject(new Error(res.statusText))))
    .then(
      (blob) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = () => reject(reader.error)
          reader.readAsDataURL(blob)
        })
    )
    .catch(() => {
      icons.delete(url)
      return null
    })
  icons.set(url, icon)
  return icon
}

/** The rendered code as a standalone SVG file, the icon embedded (or left out when it can't be read). */
async function svgFile(svg: SVGSVGElement, iconUrl: string) {
  const copy = svg.cloneNode(true) as SVGSVGElement
  copy.setAttribute("xmlns", "http://www.w3.org/2000/svg")
  copy.setAttribute("width", String(FILE_SIZE))
  copy.setAttribute("height", String(FILE_SIZE))
  copy.removeAttribute("class")
  const image = copy.querySelector("image")
  const data = await iconDataUrl(iconUrl)
  if (data) {
    // xlink:href rather than href: older print tools only read that, browsers read both
    image?.removeAttribute("href")
    image?.setAttributeNS(XLINK, "xlink:href", data)
  } else {
    image?.remove()
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(copy)}\n`
}

/** Draws the SVG file on a white canvas; rejects when the browser won't export it. */
async function pngFile(svg: string) {
  const img = new Image()
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  await img.decode()
  const canvas = document.createElement("canvas")
  canvas.width = FILE_SIZE
  canvas.height = FILE_SIZE
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("no canvas")
  ctx.fillStyle = "#fff"
  ctx.fillRect(0, 0, FILE_SIZE, FILE_SIZE)
  ctx.drawImage(img, 0, 0, FILE_SIZE, FILE_SIZE)
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("no PNG"))), "image/png"))
}

function save(fileName: string, blob: Blob) {
  const href = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = href
  a.download = fileName
  a.click()
  setTimeout(() => URL.revokeObjectURL(href), 1000)
}
