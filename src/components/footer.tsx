import { CoffeeIcon, HeartIcon, StarIcon, TicketIcon } from "lucide-react"

import { LinkedInIcon, TelegramIcon, WhatsAppIcon } from "@/components/brand-icons"
import { HitexText } from "@/components/highlight"
import { Button } from "@/components/ui/button"
import {
  AUTHOR_LINKEDIN_URL,
  AUTHOR_NAME,
  BUY_ME_A_COFFEE_URL,
  GITHUB_URL,
  HITEX_PASS_URL,
  TELEGRAM_URL,
  WHATSAPP_URL,
} from "@/lib/links"

const quietLink = "inline-flex items-center gap-1 underline-offset-3 hover:text-foreground hover:underline"


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
            <a href="#/contribution" className={quietLink}>
              Contribution
            </a>
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className={quietLink}>
              <WhatsAppIcon className="size-3.5 text-[#25D366]" />
              WhatsApp
            </a>
            <a href={TELEGRAM_URL} target="_blank" rel="noreferrer" className={quietLink}>
              <TelegramIcon className="size-3.5 text-[#26A5E4]" />
              Telegram
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
