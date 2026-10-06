// Clean addresses (/jobs, /startups/<slug>) with the History API. Same-site links are opened by the app
// without reloading the page; old /#/… addresses (earlier links, printed QR codes) open their clean form.
import { useEffect, useState } from "react"

import { datasets, type DatasetKey } from "@/lib/datasets"

/**
 * `profile:<slug>` is a startup page at /startups/<slug>; `form` is the profile form at
 * /contribution/form (?startup=<HITEX id> to start with one), `form:<slug>` edits a profile.
 */
export type Route = DatasetKey | "jobs" | "about" | "contribution" | "form" | `profile:${string}` | `form:${string}` | null

const BASE = import.meta.env.BASE_URL

/** The route of an address path ("/jobs", "/startups/lyia_ai/"); null is the home page or unknown. */
export function routeFromPath(pathname: string): Route {
  const key = pathname.slice(BASE.length).replace(/\/+$/, "")
  if (key === "about" || key === "contribution" || key === "jobs") return key
  if (key === "contribution/form") return "form"
  const edit = /^contribution\/form\/([a-z0-9_]+)$/.exec(key)
  if (edit) return `form:${edit[1]}`
  const profile = /^startups\/([a-z0-9_]+)$/.exec(key)
  if (profile) return `profile:${profile[1]}`
  return key in datasets ? (key as DatasetKey) : null
}

const isAppPath = (pathname: string) => pathname === BASE || routeFromPath(pathname) !== null

/**
 * One address per page: an old /#/jobs or /#/contribution?startup=… becomes /jobs, /contribution?startup=…,
 * and /agenda/ becomes /agenda.
 */
export function upgradeHashAddress() {
  const { hash, pathname, search } = window.location
  if (hash.startsWith("#/")) history.replaceState(history.state, "", `${BASE}${hash.slice(2)}`)
  else if (pathname.length > BASE.length && pathname.endsWith("/")) history.replaceState(history.state, "", pathname.replace(/\/+$/, "") + search + hash)
}

const CHANGE = "app:navigate"

/** Opens an address of the app without reloading the page. */
export function navigate(to: string, { replace = false } = {}) {
  history[replace ? "replaceState" : "pushState"](null, "", to)
  window.scrollTo(0, 0)
  window.dispatchEvent(new Event(CHANGE))
}

/** Clicks on same-site app links go through `navigate`; files (data, YAML, images) and new tabs don't. */
function onLinkClick(e: MouseEvent) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
  const a = (e.target as Element | null)?.closest?.("a")
  if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return
  const url = new URL(a.href, window.location.href)
  if (url.origin !== window.location.origin || !isAppPath(url.pathname)) return
  // a link to a spot on the same page (#…) is the browser's job
  if (url.pathname === window.location.pathname && url.search === window.location.search && url.hash) return
  e.preventDefault()
  if (url.pathname + url.search !== window.location.pathname + window.location.search) navigate(url.pathname + url.search)
}

export function useRoute() {
  const [where, setWhere] = useState(() => window.location.pathname + window.location.search)
  useEffect(() => {
    const onChange = () => {
      upgradeHashAddress()
      setWhere(window.location.pathname + window.location.search)
    }
    window.addEventListener(CHANGE, onChange)
    window.addEventListener("popstate", onChange)
    // someone pastes an old /#/… address into an open tab
    window.addEventListener("hashchange", onChange)
    document.addEventListener("click", onLinkClick)
    return () => {
      window.removeEventListener(CHANGE, onChange)
      window.removeEventListener("popstate", onChange)
      window.removeEventListener("hashchange", onChange)
      document.removeEventListener("click", onLinkClick)
    }
  }, [])
  const at = where.indexOf("?")
  return {
    route: routeFromPath(at < 0 ? where : where.slice(0, at)),
    query: new URLSearchParams(at < 0 ? "" : where.slice(at)),
  }
}
