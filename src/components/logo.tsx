import { cn } from "@/lib/utils"

const src = (theme: "light" | "dark") => `${import.meta.env.BASE_URL}brand/logo-${theme}.png`

/** HITEX Explorer wordmark; the dark-theme file has white "Explorer" text. */
export function Logo({ className }: { className?: string }) {
  return (
    <>
      <img src={src("light")} alt="HITEX Explorer" className={cn("dark:hidden", className)} />
      <img src={src("dark")} alt="HITEX Explorer" className={cn("hidden dark:block", className)} />
    </>
  )
}
