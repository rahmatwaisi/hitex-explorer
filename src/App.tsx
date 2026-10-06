import { lazy, Suspense, useCallback, useEffect, useState } from "react"
import { MoonIcon, SunIcon } from "lucide-react"

import { AboutPage } from "@/components/about-page"
import { ContributionPage } from "@/components/contribution-page"
import { DatasetPage } from "@/components/dataset-page"
import { Footer } from "@/components/footer"
import { HomePage } from "@/components/home-page"
import { KeywordHighlights } from "@/components/keyword-highlights"
import { Logo } from "@/components/logo"
import { Loading, ProfilePage } from "@/components/profile-page"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useTheme } from "@/hooks/use-theme"
import { LANGS, type Lang } from "@/lib/data"
import { datasetKeys, datasets, type DatasetKey } from "@/lib/datasets"
import { nextColor, type Keyword } from "@/lib/keywords"

// the profile form brings Ajv, the schema and the YAML writer, so it loads only when opened
const ProfileFormPage = lazy(() => import("@/components/profile-form"))

/**
 * `profile:<slug>` is a startup page at #/startups/<slug>; `form` is the profile form at
 * #/contribution/form (?startup=<HITEX id> to start with one), `form:<slug>` edits a profile.
 */
type Route = DatasetKey | "about" | "contribution" | "form" | `profile:${string}` | `form:${string}` | null

function routeFromHash(hash: string): Route {
  const key = hash.replace(/^#\/?/, "").split("?")[0]
  if (key === "about" || key === "contribution") return key
  if (key === "contribution/form") return "form"
  const edit = /^contribution\/form\/([a-z0-9_]+)$/.exec(key)
  if (edit) return `form:${edit[1]}`
  const profile = /^startups\/([a-z0-9_]+)$/.exec(key)
  if (profile) return `profile:${profile[1]}`
  return key in datasets ? (key as DatasetKey) : null
}

const isProfile = (route: Route): route is `profile:${string}` => !!route?.startsWith("profile:")
const isForm = (route: Route): route is "form" | `form:${string}` => route === "form" || !!route?.startsWith("form:")
const navKey = (route: Route) => (isProfile(route) ? "startups" : isForm(route) ? "contribution" : route)

function useRoute() {
  const [hash, setHash] = useState(() => window.location.hash)
  useEffect(() => {
    const onChange = () => {
      setHash(window.location.hash)
      window.scrollTo(0, 0)
    }
    window.addEventListener("hashchange", onChange)
    return () => window.removeEventListener("hashchange", onChange)
  }, [])
  return { route: routeFromHash(hash), query: new URLSearchParams(hash.split("?")[1] ?? "") }
}

let nextKeywordId = 1

export default function App() {
  const { route, query } = useRoute()
  const [lang, setLang] = useState<Lang>("en")
  const { theme, setTheme } = useTheme()
  const [keywords, setKeywords] = useState<Keyword[]>([])

  const addKeyword = (text: string) => {
    if (keywords.some((k) => k.text.toLowerCase() === text.toLowerCase())) return
    setKeywords([...keywords, { id: nextKeywordId++, text, color: nextColor(keywords) }])
  }
  const removeKeyword = useCallback((id: number) => setKeywords((ks) => ks.filter((k) => k.id !== id)), [])
  const clearKeywords = useCallback(() => setKeywords([]), [])

  return (
    <div className="flex min-h-svh flex-col">
      {/* one row from lg up; below that the nav moves to a second, scrollable row (height: --header-h in index.css) */}
      <header className="sticky top-0 z-20 h-(--header-h) border-b bg-background">
        <div className="mx-auto flex h-full max-w-[1800px] flex-wrap items-center gap-x-2 px-4 sm:px-6 lg:flex-nowrap">
          <a href="#/" className="me-2 flex h-14 shrink-0 items-center" aria-label="HITEX Explorer home">
            <Logo className="h-5 w-auto sm:h-7" />
          </a>
          <nav className="order-last -mx-1 flex h-11 w-full min-w-0 items-center gap-1 overflow-x-auto px-1 [scrollbar-width:none] lg:order-none lg:h-auto lg:w-auto">
            {datasetKeys.map((key) => (
              <Button key={key} variant={navKey(route) === key ? "secondary" : "ghost"} size="sm" asChild>
                <a href={`#/${key}`}>{datasets[key].title}</a>
              </Button>
            ))}
            <Button variant={navKey(route) === "contribution" ? "secondary" : "ghost"} size="sm" asChild>
              <a href="#/contribution">Contribution</a>
            </Button>
            <Button variant={route === "about" ? "secondary" : "ghost"} size="sm" asChild>
              <a href="#/about">About</a>
            </Button>
          </nav>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            spacing={0}
            value={lang}
            onValueChange={(v) => v && setLang(v as Lang)}
            className="ms-auto shrink-0"
            aria-label="Card language"
          >
            {LANGS.map((l) => (
              <ToggleGroupItem key={l.value} value={l.value} aria-label={l.label}>
                {l.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            title={theme === "dark" ? "Light theme" : "Dark theme"}
          >
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </Button>
        </div>
      </header>

      <main className="flex-1">
        {route === "about" ? (
          <AboutPage />
        ) : route === "contribution" ? (
          <ContributionPage lang={lang} />
        ) : isForm(route) ? (
          <Suspense fallback={<Loading what="the form" />}>
            <ProfileFormPage
              key={`${route}?${query.get("startup") ?? ""}`}
              slug={route === "form" ? undefined : route.slice("form:".length)}
              startId={query.get("startup") ?? undefined}
              lang={lang}
            />
          </Suspense>
        ) : isProfile(route) ? (
          // the search keywords stay on and are highlighted in the profile
          <KeywordHighlights keywords={keywords} onClear={clearKeywords}>
            <ProfilePage key={route} slug={route.slice("profile:".length)} lang={lang} />
          </KeywordHighlights>
        ) : route ? (
          <DatasetPage
            key={route}
            dataset={route}
            lang={lang}
            keywords={keywords}
            onAddKeyword={addKeyword}
            onRemoveKeyword={removeKeyword}
            onClearKeywords={clearKeywords}
          />
        ) : (
          <HomePage />
        )}
      </main>
      <Footer />
    </div>
  )
}
