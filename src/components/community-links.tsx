import type { CSSProperties, ComponentType } from "react"
import { ArrowUpRightIcon } from "lucide-react"

import { TelegramIcon, WhatsAppIcon } from "@/components/brand-icons"
import { TELEGRAM_URL, WHATSAPP_URL } from "@/lib/links"
import { cn } from "@/lib/utils"

/** Small brand-tinted link card: icon (or image) in a circle, name, subtitle, arrow. */
export function LinkCard({
  href,
  name,
  subtitle = "Join the community",
  color,
  icon: Icon,
  image,
  internal = false,
}: {
  href: string
  name: string
  subtitle?: string
  color: string
  icon?: ComponentType<{ className?: string }>
  /** image shown on a white circle instead of an icon */
  image?: string
  /** stays on this site (same tab) */
  internal?: boolean
}) {
  return (
    <a
      href={href}
      {...(internal ? {} : { target: "_blank", rel: "noreferrer" })}
      style={{ "--brand": color } as CSSProperties}
      className="group flex min-w-56 items-center gap-3 rounded-xl border border-(--brand)/40 bg-(--brand)/10 px-4 py-3 text-start transition-colors hover:border-(--brand)/70 hover:bg-(--brand)/20 focus-visible:ring-3 focus-visible:ring-(--brand)/40 focus-visible:outline-none"
    >
      {image ? (
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-(--brand)/40">
          <img src={image} alt="" className="size-7 object-contain" />
        </span>
      ) : (
        Icon && (
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-(--brand) text-white">
            <Icon className="size-5" />
          </span>
        )
      )}
      <span className="flex flex-1 flex-col">
        <span className="font-semibold text-foreground">{name}</span>
        <span className="text-sm text-muted-foreground">{subtitle}</span>
      </span>
      <ArrowUpRightIcon className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground" />
    </a>
  )
}

/** WhatsApp and Telegram join cards, side by side with "or" between (stacked on small screens). */
export function CommunityLinks({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col items-stretch gap-3 sm:flex-row sm:items-center", className)}>
      <LinkCard href={WHATSAPP_URL} name="WhatsApp" color="#25D366" icon={WhatsAppIcon} />
      <span className="text-center text-sm text-muted-foreground">or</span>
      <LinkCard href={TELEGRAM_URL} name="Telegram" color="#26A5E4" icon={TelegramIcon} />
    </div>
  )
}
