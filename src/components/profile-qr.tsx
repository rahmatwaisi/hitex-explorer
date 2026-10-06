import { useMemo, useRef, useState } from "react"
import { DownloadIcon, Loader2Icon, ScanQrCodeIcon } from "lucide-react"
import { encode } from "uqr"

import { HitexText } from "@/components/highlight"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { Lang } from "@/lib/data"
import { profileUrl } from "@/lib/links"

const HITEX_RED = "#EB2637"
/** near-black modules on white in both themes: phone cameras need dark on light */
const INK = "#111114"
/** white margin around the code, in modules (the QR spec asks for 4) */
const QUIET = 4
const ICON_URL = `${import.meta.env.BASE_URL}brand/apple-touch-icon.png`
/** width and height of a downloaded file, in pixels */
const FILE_SIZE = 1024
const XLINK = "http://www.w3.org/1999/xlink"

/**
 * A QR code of the startup's page on this site, for visitors to scan at its HITEX booth,
 * with SVG (print) and PNG downloads. Renders nothing while the profile has no slug.
 */
export function ProfileQr({ slug, name, lang }: { slug: string; name: string; lang?: Lang }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [busy, setBusy] = useState<"svg" | "png" | null>(null)
  const url = profileUrl(slug)
  const qr = useMemo(() => (slug ? qrShapes(url) : null), [slug, url])
  if (!qr) return null

  const download = async (kind: "svg" | "png") => {
    if (!svgRef.current || busy) return
    setBusy(kind)
    try {
      const svg = await svgFile(svgRef.current)
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
            <path d={qr.modules} fill={INK} />
            {qr.finders.map(([x, y]) => (
              <g key={`${x},${y}`}>
                <rect x={x + 0.5} y={y + 0.5} width={6} height={6} rx={1.75} fill="none" stroke={HITEX_RED} strokeWidth={1} />
                <rect x={x + 2} y={y + 2} width={3} height={3} rx={0.9} fill={INK} />
              </g>
            ))}
            <image href={ICON_URL} x={hole.at + 0.6} y={hole.at + 0.6} width={hole.size - 1.2} height={hole.size - 1.2} />
          </svg>
        </div>
        <div className="flex min-w-0 flex-1 flex-col items-center gap-3 text-center sm:items-start sm:text-start">
          <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <ScanQrCodeIcon className="size-4" style={{ color: HITEX_RED }} /> Open on your phone
          </p>
          <p className="text-xl font-semibold text-balance sm:text-2xl">
            Scan to see <bdi lang={lang}>{name || "this startup"}</bdi> at a glance
          </p>
          <p className="max-w-prose text-muted-foreground">
            <HitexText>Point your phone camera at the code to open this page — handy at the HITEX booth.</HitexText>
          </p>
          <p dir="ltr" className="font-mono text-xs break-all text-muted-foreground">
            {url.replace("https://", "")}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <Button size="sm" onClick={() => download("svg")} disabled={!!busy} title="SVG: sharp at any print size">
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

/**
 * The code in SVG units (one per module, quiet zone included): data modules as one path, the three
 * finder patterns drawn separately (rounded, in HITEX red), and a clear square in the center for the icon.
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

let icon: Promise<string | null> | undefined
/** The HITEX icon as a data URL (fetched once), so downloads show it offline; null when it can't be read. */
function iconDataUrl() {
  icon ??= fetch(ICON_URL)
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
      icon = undefined
      return null
    })
  return icon
}

/** The rendered code as a standalone SVG file, the icon embedded (or left out when it can't be read). */
async function svgFile(svg: SVGSVGElement) {
  const copy = svg.cloneNode(true) as SVGSVGElement
  copy.setAttribute("xmlns", "http://www.w3.org/2000/svg")
  copy.setAttribute("width", String(FILE_SIZE))
  copy.setAttribute("height", String(FILE_SIZE))
  copy.removeAttribute("class")
  const image = copy.querySelector("image")
  const data = await iconDataUrl()
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
