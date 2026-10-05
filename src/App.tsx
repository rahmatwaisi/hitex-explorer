import { useCallback, useEffect, useState } from "react"
import { MoonIcon, SunIcon } from "lucide-react"

import { DatasetPage } from "@/components/dataset-page"
import { HomePage } from "@/components/home-page"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useTheme } from "@/hooks/use-theme"
import { LANGS, type Lang } from "@/lib/data"
import { datasetKeys, datasets, type DatasetKey } from "@/lib/datasets"
import { nextColor, type Keyword } from "@/lib/keywords"

function routeFromHash(): DatasetKey | null {
  const key = window.location.hash.replace(/^#\/?/, "")
  return key in datasets ? (key as DatasetKey) : null
}

function useRoute() {
  const [route, setRoute] = useState(routeFromHash)
  useEffect(() => {
    const onChange = () => {
      setRoute(routeFromHash())
      window.scrollTo(0, 0)
    }
    window.addEventListener("hashchange", onChange)
    return () => window.removeEventListener("hashchange", onChange)
  }, [])
  return route
}

let nextKeywordId = 1

export default function App() {
  const route = useRoute()
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
    <div className="min-h-svh">
      <header className="sticky top-0 z-20 h-14 border-b bg-background">
        <div className="mx-auto flex h-full max-w-[1800px] items-center gap-2 px-4 sm:px-6">
          <a href="#/" className="me-2 font-semibold tracking-tight">
            HITEX
          </a>
          <nav className="-my-2 flex min-w-0 gap-1 overflow-x-auto py-2 [scrollbar-width:none]">
            {datasetKeys.map((key) => (
              <Button key={key} variant={route === key ? "secondary" : "ghost"} size="sm" asChild>
                <a href={`#/${key}`}>{datasets[key].title}</a>
              </Button>
            ))}
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

      <main>
        {route ? (
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
    </div>
  )
}
