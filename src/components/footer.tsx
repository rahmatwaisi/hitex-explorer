import { CoffeeIcon, HeartIcon, StarIcon, TicketIcon } from "lucide-react"

import { HitexText } from "@/components/highlight"
import { Button } from "@/components/ui/button"
import { AUTHOR_LINKEDIN_URL, AUTHOR_NAME, BUY_ME_A_COFFEE_URL, GITHUB_URL, HITEX_PASS_URL } from "@/lib/links"

const quietLink = "inline-flex items-center gap-1 underline-offset-3 hover:text-foreground hover:underline"

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
    </svg>
  )
}

export function Footer() {
  return (
    <footer className="mt-12 border-t">
      <div className="mx-auto flex max-w-[1800px] flex-col gap-4 px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="flex items-center gap-1.5">
            Created with <HeartIcon className="size-4 fill-red-500 text-red-500" aria-label="love" /> by{" "}
            <span className="font-medium">{AUTHOR_NAME}</span>
            <a
              href={AUTHOR_LINKEDIN_URL}
              target="_blank"
              rel="noreferrer"
              aria-label={`${AUTHOR_NAME} on LinkedIn`}
              title="LinkedIn"
              className="ms-1 text-[#0A66C2] transition-opacity hover:opacity-80 dark:text-[#4c9be8]"
            >
              <LinkedInIcon className="size-5" />
            </a>
          </p>
          <Button variant="outline" asChild>
            <a href={HITEX_PASS_URL} target="_blank" rel="noreferrer">
              <TicketIcon data-icon="inline-start" />
              Get your HITEX pass
            </a>
          </Button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <p>
            <HitexText>Unofficial project, not affiliated with HITEX. Data collected from the public HITEX website.</HitexText>
          </p>
          <nav aria-label="Project links" className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <a href="#/about" className={quietLink}>
              About
            </a>
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className={quietLink}>
              <StarIcon className="size-3.5" />
              Star on GitHub
            </a>
            <a href={BUY_ME_A_COFFEE_URL} target="_blank" rel="noreferrer" className={quietLink}>
              <CoffeeIcon className="size-3.5" />
              Buy me a coffee
            </a>
          </nav>
        </div>
      </div>
    </footer>
  )
}
