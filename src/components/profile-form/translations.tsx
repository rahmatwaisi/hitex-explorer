// Arabic, Kurdish and Persian versions of every English text, side by side with the English.
import { useState, type ReactNode } from "react"

import { LANG_NAMES } from "@/components/profile-form/draft"
import { Group, TextArea, TextInput, TextList, useForm } from "@/components/profile-form/fields"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Lang } from "@/lib/data"
import type { Profile } from "@/lib/profile-rules"

type Other = Exclude<Lang, "en">

const COMPANY_TEXTS: [field: string, label: string, max: number, long: boolean][] = [
  ["name", "Name", 80, false],
  ["tagline", "Tagline", 90, false],
  ["description", "Description", 700, true],
  ["area_of_work", "Area of work", 120, false],
  ["aim", "Aim", 700, true],
  ["impact", "Impact", 700, true],
  ["seeking_note", "What you're looking for", 700, true],
  ["looking_for", "Who you want on the team", 700, true],
  ["culture", "How the team works", 700, true],
  ["why_join", "Why join you", 700, true],
]

const POSITION_LISTS: [field: string, label: string][] = [
  ["responsibilities", "Responsibilities"],
  ["requirements", "Requirements"],
  ["nice_to_have", "Nice to have"],
]

export function TranslationsStep() {
  const [lang, setLang] = useState<Other>("ar")
  const { get } = useForm()
  const filled = (path: string) => {
    const v = get(path)
    return Array.isArray(v) ? v.some((x) => `${x ?? ""}`.trim()) : !!`${v ?? ""}`.trim()
  }
  const products = (get("products") as Profile[] | undefined) ?? []
  const positions = (get("hiring.positions") as Profile[] | undefined) ?? []
  const company = COMPANY_TEXTS.filter(([f]) => filled(`i18n.en.${f}`) || filled(`i18n.${lang}.${f}`))

  return (
    <>
      <p className="text-sm text-muted-foreground">
        Optional. Visitors who choose a language see your text in it; empty fields show the English text. Only fields
        you filled in English are listed.
      </p>
      <Tabs value={lang} onValueChange={(v) => setLang(v as Other)}>
        <TabsList className="h-9">
          {(["ar", "ku", "fa"] as const).map((l) => (
            <TabsTrigger key={l} value={l} className="px-3">
              {LANG_NAMES[l]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Group title="Company">
        {company.map(([field, label, max, long]) => (
          <Translated key={field} label={label} english={get(`i18n.en.${field}`) as string}>
            {long ? (
              <TextArea path={`i18n.${lang}.${field}`} label={LANG_NAMES[lang]} maxLength={max} lang={lang} />
            ) : (
              <TextInput path={`i18n.${lang}.${field}`} label={LANG_NAMES[lang]} maxLength={max} lang={lang} />
            )}
          </Translated>
        ))}
      </Group>

      {products.some((_, i) => filled(`products.${i}._texts.en`)) && (
        <Group title="Products">
          {products.map((x, i) =>
            filled(`products.${i}._texts.en`) ? (
              <Translated key={x._uid ?? i} label={`Product ${i + 1}`} english={x._texts.en}>
                <TextInput path={`products.${i}._texts.${lang}`} label={LANG_NAMES[lang]} maxLength={200} lang={lang} />
              </Translated>
            ) : null
          )}
        </Group>
      )}

      {positions.map((pos, i) => {
        const en = `hiring.positions.${i}._texts.en`
        const at = `hiring.positions.${i}._texts.${lang}`
        if (!filled(`${en}.title`)) return null
        return (
          <Group key={pos._uid ?? i} title={`Position: ${pos._texts.en.title}`}>
            <Translated label="Title" english={pos._texts.en.title}>
              <TextInput path={`${at}.title`} label={LANG_NAMES[lang]} maxLength={80} lang={lang} />
            </Translated>
            {filled(`${en}.summary`) && (
              <Translated label="Summary" english={pos._texts.en.summary}>
                <TextInput path={`${at}.summary`} label={LANG_NAMES[lang]} maxLength={300} lang={lang} />
              </Translated>
            )}
            {POSITION_LISTS.filter(([f]) => filled(`${en}.${f}`)).map(([f, label]) => (
              <Translated key={f} label={label} english={(pos._texts.en[f] as string[]).filter((s) => s.trim()).map((s) => `• ${s}`).join("\n")}>
                <TextList path={`${at}.${f}`} label={LANG_NAMES[lang]} max={12} lang={lang} />
              </Translated>
            ))}
          </Group>
        )
      })}
    </>
  )
}

/** A text's English original above the field that translates it. */
function Translated({ label, english, children }: { label: string; english: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="font-medium">{label}</p>
      <p lang="en" dir="ltr" className="rounded-lg bg-muted px-3 py-2 text-sm whitespace-pre-line text-muted-foreground">
        {english}
      </p>
      {children}
    </div>
  )
}
