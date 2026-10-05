import { Button } from "@/components/ui/button"
import { datasetKeys, datasets } from "@/lib/datasets"

export function HomePage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col items-center gap-10 px-4 py-16 text-center sm:px-6">
      <div className="flex flex-col gap-3">
        <h1 className="text-4xl font-semibold tracking-tight">HITEX data explorer</h1>
        <p className="text-muted-foreground">
          Open a dataset, then type keywords and press Enter to highlight them across every card.
        </p>
      </div>
      <div className="grid w-full gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {datasetKeys.map((key) => {
          const { title, blurb, file, icon: Icon } = datasets[key]
          return (
            <Button
              key={key}
              variant="outline"
              asChild
              className="h-auto flex-col items-start justify-start gap-3 rounded-xl p-6 text-start whitespace-normal"
            >
              <a href={`#/${key}`}>
                <Icon className="size-7! text-primary" />
                <span className="text-xl font-semibold">{title}</span>
                <span className="font-normal text-muted-foreground">{blurb}</span>
                <span className="font-mono text-xs text-muted-foreground">data/{file}</span>
              </a>
            </Button>
          )
        })}
      </div>
    </div>
  )
}
