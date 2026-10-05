import { useCallback, useState } from "react"

export type Theme = "light" | "dark"

const currentTheme = (): Theme => (document.documentElement.classList.contains("dark") ? "dark" : "light")

/** Light/dark theme on the <html> class, remembered in localStorage (index.html applies it before paint). */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(currentTheme)

  const setTheme = useCallback((next: Theme) => {
    document.documentElement.classList.toggle("dark", next === "dark")
    try {
      localStorage.setItem("theme", next)
    } catch {
      // storage blocked: theme still applies for this visit
    }
    setThemeState(next)
  }, [])

  return { theme, setTheme }
}
