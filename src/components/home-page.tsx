import { TelegramIcon, WhatsAppIcon } from "@/components/brand-icons"
import { HitexText } from "@/components/highlight"
import { Logo } from "@/components/logo"
import { datasetKeys, datasets } from "@/lib/datasets"
import { TELEGRAM_URL, WHATSAPP_URL } from "@/lib/links"

const communityLink = "font-medium whitespace-nowrap text-foreground underline-offset-3 hover:underline"

export function HomePage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col items-center gap-10 px-4 py-16 text-center sm:px-6">
      <div className="flex flex-col items-center gap-5">
        <h1 className="flex w-full justify-center">
          <Logo className="h-auto w-80 max-w-full sm:w-[30rem] lg:w-[44rem]" />
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          <HitexText>
            Search the public data of HITEX 2026. Open a dataset, then type keywords and press Enter to highlight
            them across every card.
          </HitexText>
        </p>
      </div>
      <div className="grid w-full gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {datasetKeys.map((key) => {
          const { title, blurb, file, icon: Icon } = datasets[key]
          return (
            // the title link stretches over the whole card; HITEX links in the blurb sit above it
            <div
              key={key}
              className="relative flex flex-col items-start gap-3 rounded-xl border border-border bg-background p-6 text-start transition-colors focus-within:ring-3 focus-within:ring-ring/50 hover:bg-muted dark:border-input dark:bg-input/30 dark:hover:bg-input/50"
            >
              <Icon className="size-7 text-primary" />
              <a href={`#/${key}`} className="text-xl font-semibold outline-none after:absolute after:inset-0 after:rounded-xl">
                {title}
              </a>
              <span className="text-sm text-muted-foreground [&_a]:relative [&_a]:z-10">
                <HitexText>{blurb}</HitexText>
              </span>
              <span className="font-mono text-xs text-muted-foreground">data/{file}</span>
            </div>
          )
        })}
      </div>
      <p className="text-muted-foreground">
        Looking for work or hiring? Join the community on{" "}
        <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className={communityLink}>
          <WhatsAppIcon className="me-1 inline size-4 align-[-3px] text-[#25D366]" />
          WhatsApp
        </a>{" "}
        or{" "}
        <a href={TELEGRAM_URL} target="_blank" rel="noreferrer" className={communityLink}>
          <TelegramIcon className="me-1 inline size-4 align-[-3px] text-[#26A5E4]" />
          Telegram
        </a>
        .
      </p>
    </div>
  )
}
