// Last step: consent, what still needs fixing, the generated file, and the ways to send it.
import { useState, type ReactNode } from "react"
import { AlertTriangleIcon, CheckCircle2Icon, CheckIcon, CopyIcon, DownloadIcon, ExternalLinkIcon, Loader2Icon, SendIcon } from "lucide-react"

import { GitHubIcon } from "@/components/brand-icons"
import { Confirm } from "@/components/profile-form/fields"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { GITHUB_URL } from "@/lib/links"

export interface Issue {
  message: string
  /** form path of the field, or "" */
  path: string
  step: number
}

export interface Checked {
  yaml: string
  fileName: string
  slug: string
  hitexId: string
  name: string
  issues: Issue[]
  warnings: Issue[]
}

/** GitHub refuses longer links (tested: ~6,900 characters), so long files are pasted instead. */
const MAX_LINK = 6000
const STARTUPS_PATH = "public/startups"

const withoutPath = (message: string) => message.replace(/^[\w.[\]-]+: /, "")

export function ReviewStep({
  checked,
  mode,
  hasMaintainers,
  steps,
  goTo,
}: {
  checked: Checked
  mode: "new" | "edit"
  hasMaintainers: boolean
  steps: string[]
  goTo: (step: number) => void
}) {
  const { issues, warnings } = checked
  const ok = issues.length === 0
  const byStep = [...new Set(issues.map((i) => i.step))].sort((a, b) => a - b)

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h3 className="font-medium">Consent</h3>
        <Confirm path="consent.authorized" label="I represent this startup and may publish this profile." />
        <Confirm path="consent.people_agreed" label="Everyone listed as founder, team member or hiring contact agreed to appear." />
        <Confirm path="consent.rights_to_logo" label="We own the logo, or may use it." />
        <p className="text-xs text-muted-foreground">
          Profile text is shared under{" "}
          <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer" className="underline underline-offset-2">
            CC BY 4.0
          </a>
          , so others can reuse it with credit.
        </p>
      </section>

      {ok ? (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3">
          <CheckCircle2Icon className="mt-0.5 size-5 shrink-0 text-emerald-500" />
          <div className="flex flex-col gap-1">
            <p className="font-medium">Your profile passes every check</p>
            <p className="text-sm text-muted-foreground">The same checks run again on GitHub when it's submitted.</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
          <p className="flex items-center gap-2 font-medium">
            <AlertTriangleIcon className="size-5 text-destructive" />
            {issues.length === 1 ? "1 thing to fix" : `${issues.length} things to fix`}
          </p>
          {byStep.map((step) => (
            <div key={step} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{steps[step]}</p>
                {step !== steps.length - 1 && (
                  <Button size="xs" variant="outline" onClick={() => goTo(step)}>
                    Go to {steps[step]}
                  </Button>
                )}
              </div>
              <ul className="list-disc space-y-0.5 ps-5 text-sm">
                {issues
                  .filter((i) => i.step === step)
                  .map((i) => (
                    <li key={i.message}>
                      {withoutPath(i.message)}
                      {i.path && <span className="ms-1.5 font-mono text-xs text-muted-foreground">{i.path}</span>}
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      {warnings.length > 0 && (
        <ul className="list-disc space-y-0.5 ps-5 text-sm text-muted-foreground">
          {warnings.map((w) => (
            <li key={w.message}>{withoutPath(w.message)}</li>
          ))}
        </ul>
      )}

      <FileCard checked={checked} />

      <div className="grid gap-4 lg:grid-cols-2">
        <GitHubCard checked={checked} mode={mode} ready={ok} hasMaintainers={hasMaintainers} />
        <SendCard checked={checked} mode={mode} ready={ok} />
      </div>
    </div>
  )
}

function useCopy() {
  const [copied, setCopied] = useState(false)
  const copy = (text: string) =>
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
        return true
      })
      .catch(() => false)
  return { copied, copy }
}

function download(fileName: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/yaml;charset=utf-8" }))
  const a = document.createElement("a")
  a.href = url
  a.download = fileName
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function FileCard({ checked }: { checked: Checked }) {
  const { copied, copy } = useCopy()
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your file</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="font-mono text-sm break-all">
          {STARTUPS_PATH}/{checked.fileName}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => copy(checked.yaml)}>
            {copied ? <CheckIcon data-icon="inline-start" className="text-emerald-500" /> : <CopyIcon data-icon="inline-start" />} Copy
          </Button>
          <Button variant="outline" size="sm" onClick={() => download(checked.fileName, checked.yaml)}>
            <DownloadIcon data-icon="inline-start" /> Download
          </Button>
        </div>
        <details className="group">
          <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">Show the YAML</summary>
          <pre className="mt-2 max-h-[28rem] overflow-auto rounded-lg bg-muted p-3 font-mono text-xs leading-relaxed" dir="ltr">
            {checked.yaml}
          </pre>
        </details>
      </CardContent>
    </Card>
  )
}

function GitHubCard({ checked, mode, ready, hasMaintainers }: { checked: Checked; mode: "new" | "edit"; ready: boolean; hasMaintainers: boolean }) {
  const { copied, copy } = useCopy()
  const [opened, setOpened] = useState(false)
  const base =
    mode === "new"
      ? `${GITHUB_URL}/new/main/${STARTUPS_PATH}?filename=${encodeURIComponent(checked.fileName)}`
      : `${GITHUB_URL}/edit/main/${STARTUPS_PATH}/${checked.fileName}`
  const full = `${base}&value=${encodeURIComponent(checked.yaml)}`
  const prefilled = mode === "new" && full.length <= MAX_LINK
  const href = prefilled ? full : base
  const blocked = !ready ? "Fix the items above first." : !hasMaintainers ? "Add your GitHub username in the Startup step first." : ""

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitHubIcon className="size-4" /> Submit on GitHub
        </CardTitle>
      </CardHeader>
      <CardContent className="flex h-full flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Recommended. GitHub makes your own copy of the project and opens a pull request; a bot checks your file within a
          minute and a maintainer merges it. You can edit your profile yourself later.
        </p>
        {blocked ? (
          <p className="text-sm text-destructive">{blocked}</p>
        ) : (
          <Button asChild className="w-fit">
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              onClick={() => {
                // a copy as well, in case GitHub's editor opens empty
                copy(checked.yaml)
                setOpened(true)
              }}
            >
              Open GitHub <ExternalLinkIcon data-icon="inline-end" />
            </a>
          </Button>
        )}
        {opened && (
          <ol className="list-decimal space-y-1 rounded-lg bg-muted p-3 ps-8 text-sm">
            <li>Sign in to GitHub if it asks.</li>
            {mode === "edit" ? (
              <li>Your updated file is copied. In the editor, select everything (Ctrl+A or ⌘A) and paste (Ctrl+V or ⌘V).</li>
            ) : prefilled ? (
              <li>Your file is already in the editor. If it's empty, paste (Ctrl+V or ⌘V); it's copied.</li>
            ) : (
              <li>Your file is long, so it's copied instead: click in the editor and paste (Ctrl+V or ⌘V).</li>
            )}
            <li>Click “Commit changes…”, then “Propose changes”.</li>
            <li>Click “Create pull request”. The bot's comment tells you if anything needs fixing.</li>
          </ol>
        )}
        {opened && (
          <Button variant="ghost" size="sm" className="w-fit" onClick={() => copy(checked.yaml)}>
            {copied ? <CheckIcon data-icon="inline-start" className="text-emerald-500" /> : <CopyIcon data-icon="inline-start" />} Copy the file again
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

type SendState = { status: "idle" | "sending" | "sent" } | { status: "error"; message: string }

/** Netlify Forms: the form is declared in index.html so Netlify detects it when the site is deployed. */
function SendCard({ checked, mode, ready }: { checked: Checked; mode: "new" | "edit"; ready: boolean }) {
  const [name, setName] = useState("")
  const [contact, setContact] = useState("")
  const [note, setNote] = useState("")
  const [state, setState] = useState<SendState>({ status: "idle" })

  const send = async () => {
    setState({ status: "sending" })
    const body = new URLSearchParams({
      "form-name": "startup-profile",
      "bot-field": "",
      name,
      contact,
      note,
      mode,
      hitex_id: checked.hitexId,
      slug: checked.slug,
      file: checked.fileName,
      yaml: checked.yaml,
    })
    try {
      const res = await fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: body.toString() })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setState({ status: "sent" })
    } catch (e) {
      setState({ status: "error", message: (e as Error).message })
    }
  }

  if (state.status === "sent") {
    return (
      <Card>
        <CardContent className="flex h-full items-start gap-2">
          <CheckCircle2Icon className="mt-0.5 size-5 shrink-0 text-emerald-500" />
          <div className="flex flex-col gap-1">
            <p className="font-medium">Sent. Thank you!</p>
            <p className="text-sm text-muted-foreground">
              We'll add your profile and contact you at {contact} if anything is unclear. Your draft stays in this browser.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const canSend = ready && name.trim().length >= 2 && contact.trim().length >= 5 && state.status !== "sending"
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SendIcon className="size-4" /> Send without GitHub
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          No GitHub account? Send your file to the project maintainer, who adds it for you. Later changes also go through
          them.
        </p>
        <Row label="Your name">
          <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9" autoComplete="name" />
        </Row>
        <Row label="Email or phone" hint="Only used to reach you about this profile. Not published.">
          <Input value={contact} onChange={(e) => setContact(e.target.value)} className="h-9" autoComplete="email" />
        </Row>
        <Row label="Message (optional)">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={1000} />
        </Row>
        {!ready && <p className="text-sm text-destructive">Fix the items above first.</p>}
        {state.status === "error" && (
          <p className="text-sm text-destructive">
            Couldn't send ({state.message}). Download your file and send it to us in the community group instead.
          </p>
        )}
        <Button className="w-fit" disabled={!canSend} onClick={send}>
          {state.status === "sending" ? <Loader2Icon data-icon="inline-start" className="animate-spin" /> : <SendIcon data-icon="inline-start" />} Send
        </Button>
      </CardContent>
    </Card>
  )
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </label>
  )
}
