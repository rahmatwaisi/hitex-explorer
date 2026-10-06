// Form controls bound to the draft by path ("hiring.contract.hours_per_week"), with the errors
// of the shared profile rules shown under each field.
import { createContext, useContext, useState, type ReactNode } from "react"
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { textDir, type Lang } from "@/lib/data"
import type { Vocab } from "@/lib/profile-rules"
import { cn } from "@/lib/utils"

export interface FormApi {
  get: (path: string) => unknown
  set: (path: string, value: unknown) => void
  /** errors to show for a field; `nested` also takes errors of its items and sub-fields */
  errors: (path: string, nested?: boolean) => string[]
  touch: (path: string) => void
  vocab: Vocab
}

const FormContext = createContext<FormApi | null>(null)
export const FormProvider = FormContext.Provider

export function useForm() {
  const api = useContext(FormContext)
  if (!api) throw new Error("useForm outside the profile form")
  return api
}

export const fieldId = (path: string) => `f-${path.replace(/[^a-zA-Z0-9]+/g, "-")}`

/** "hiring.positions[0].salary.min: must be at least 0" -> "must be at least 0" */
const withoutPath = (error: string) => error.replace(/^[\w.[\]-]+: /, "")

interface FieldProps {
  path: string
  label: ReactNode
  hint?: ReactNode
  required?: boolean
  nested?: boolean
  className?: string
  /** shown at the end of the label row (character counter) */
  extra?: ReactNode
  children: ReactNode
}

export function Field({ path, label, hint, required, nested, className, extra, children }: FieldProps) {
  const { errors, touch } = useForm()
  const list = errors(path, nested)
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)} onBlur={() => touch(path)}>
      <div className="flex items-baseline gap-2">
        <label htmlFor={fieldId(path)} className="text-sm font-medium">
          {label}
          {required && <span className="ms-0.5 text-destructive" aria-hidden>*</span>}
        </label>
        {extra}
      </div>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {list.map((e) => (
        <p key={e} className="text-xs text-destructive" role="alert">
          {withoutPath(e)}
        </p>
      ))}
    </div>
  )
}

type TextProps = Omit<FieldProps, "children"> & {
  placeholder?: string
  maxLength?: number
  type?: "text" | "url" | "email" | "date" | "month"
  lang?: Lang
  mono?: boolean
  readOnly?: boolean
}

/** characters left, once a text gets close to its limit */
const Counter = ({ value, max }: { value: string; max?: number }) =>
  max && max >= 20 && value.length > max * 0.7 ? (
    <span className={cn("ms-auto text-xs tabular-nums", value.length > max ? "text-destructive" : "text-muted-foreground")}>
      {value.length}/{max}
    </span>
  ) : null

export function TextInput({ placeholder, maxLength, type = "text", lang, mono, readOnly, ...field }: TextProps) {
  const { get, set, errors } = useForm()
  const value = (get(field.path) as string | undefined) ?? ""
  return (
    <Field {...field} extra={<Counter value={value} max={maxLength} />}>
      <Input
        id={fieldId(field.path)}
        type={type}
        value={value}
        placeholder={placeholder}
        readOnly={readOnly}
        onChange={(e) => set(field.path, e.target.value)}
        aria-invalid={errors(field.path, field.nested).length > 0 || undefined}
        lang={lang}
        dir={lang ? textDir(lang) : undefined}
        className={cn("h-9", mono && "font-mono", readOnly && "bg-muted")}
      />
    </Field>
  )
}

export function TextArea({ placeholder, maxLength, lang, rows = 3, ...field }: Omit<TextProps, "type" | "mono"> & { rows?: number }) {
  const { get, set, errors } = useForm()
  const value = (get(field.path) as string | undefined) ?? ""
  return (
    <Field {...field} extra={<Counter value={value} max={maxLength} />}>
      <Textarea
        id={fieldId(field.path)}
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => set(field.path, e.target.value)}
        aria-invalid={errors(field.path).length > 0 || undefined}
        lang={lang}
        dir={lang ? textDir(lang) : undefined}
        className="min-h-20"
      />
    </Field>
  )
}

export function NumberInput({ min, max, placeholder, ...field }: Omit<FieldProps, "children"> & { min?: number; max?: number; placeholder?: string }) {
  const { get, set, errors } = useForm()
  const value = get(field.path) as number | undefined
  return (
    <Field {...field}>
      <Input
        id={fieldId(field.path)}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        placeholder={placeholder}
        value={value ?? ""}
        onChange={(e) => set(field.path, e.target.value === "" ? undefined : Number(e.target.value))}
        aria-invalid={errors(field.path).length > 0 || undefined}
        className="h-9"
      />
    </Field>
  )
}

/** Options of a vocab list, without the `_open` marker. */
export function options(vocab: Vocab, list: string): [string, string][] {
  return Object.entries(vocab[list] ?? {})
    .filter(([k, v]) => k !== "_open" && typeof v === "object")
    .map(([k, v]) => [k, (v as Record<string, string>).en ?? k])
}

export function Select({ list, empty = "—", ...field }: Omit<FieldProps, "children"> & { list: string; empty?: string }) {
  const { get, set, errors, vocab } = useForm()
  const value = (get(field.path) as string | undefined) ?? ""
  return (
    <Field {...field}>
      <NativeSelect
        id={fieldId(field.path)}
        value={value}
        onChange={(e) => set(field.path, e.target.value || undefined)}
        aria-invalid={errors(field.path).length > 0 || undefined}
        className="w-full [&_select]:h-9"
      >
        <NativeSelectOption value="">{empty}</NativeSelectOption>
        {options(vocab, list).map(([k, label]) => (
          <NativeSelectOption key={k} value={k}>
            {label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </Field>
  )
}

/** Lowercase key from free text: "Ruby on Rails" -> "ruby_on_rails" */
const toKey = (text: string) =>
  text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_.+#-]/g, "")
    .replace(/^[^a-z0-9]+/, "")
    .slice(0, 40)

/** Pick several values of a list as toggle chips; open lists also take new keys. */
export function Chips({
  list,
  choices,
  open = false,
  numeric = false,
  ordered = false,
  max,
  ...field
}: Omit<FieldProps, "children" | "nested"> & {
  /** a vocab list, or fixed `choices` as [value, label] */
  list?: string
  choices?: [string, string][]
  open?: boolean
  numeric?: boolean
  /** order matters (process steps): chips show their position */
  ordered?: boolean
  max?: number
}) {
  const { get, set, vocab } = useForm()
  const [custom, setCustom] = useState("")
  const selected = ((get(field.path) as (string | number)[] | undefined) ?? []).map(String)
  const known = choices ?? options(vocab, list ?? "")
  const extra = selected.filter((k) => !known.some(([key]) => key === k))
  const save = (keys: string[]) => set(field.path, numeric ? keys.map(Number) : keys)
  const toggle = (key: string) =>
    save(selected.includes(key) ? selected.filter((k) => k !== key) : max && selected.length >= max ? selected : [...selected, key])
  const add = () => {
    const key = toKey(custom)
    if (key && !selected.includes(key)) save([...selected, key])
    setCustom("")
  }
  return (
    <Field {...field} nested>
      <div id={fieldId(field.path)} className="flex flex-wrap gap-1.5">
        {[...known, ...extra.map((k) => [k, k] as [string, string])].map(([key, label]) => {
          const on = selected.includes(key)
          return (
            <button
              key={key}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(key)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors",
                on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"
              )}
            >
              {on && ordered && <span className="tabular-nums opacity-70">{selected.indexOf(key) + 1}.</span>}
              {label}
            </button>
          )
        })}
      </div>
      {open && (
        <div className="flex max-w-sm gap-2">
          <Input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                add()
              }
            }}
            placeholder="Add another (press Enter)"
            className="h-8"
            aria-label={`Add to ${typeof field.label === "string" ? field.label : "list"}`}
          />
          <Button type="button" size="sm" variant="outline" onClick={add} disabled={!toKey(custom)}>
            Add
          </Button>
        </div>
      )}
    </Field>
  )
}

/** Yes / No; pressing the chosen answer again clears it (not saying). */
export function YesNo(field: Omit<FieldProps, "children" | "nested">) {
  const { get, set } = useForm()
  const value = get(field.path) as boolean | undefined | null
  return (
    <Field {...field}>
      <ToggleGroup
        id={fieldId(field.path)}
        type="single"
        variant="outline"
        size="sm"
        spacing={0}
        value={value === true ? "yes" : value === false ? "no" : ""}
        onValueChange={(v) => set(field.path, v === "yes" ? true : v === "no" ? false : undefined)}
        aria-label={typeof field.label === "string" ? field.label : undefined}
      >
        <ToggleGroupItem value="yes" className="px-4">
          Yes
        </ToggleGroupItem>
        <ToggleGroupItem value="no" className="px-4">
          No
        </ToggleGroupItem>
      </ToggleGroup>
    </Field>
  )
}

/** A list of short texts (responsibilities, photo links, GitHub usernames…). */
export function TextList({
  max,
  placeholder,
  lang,
  type = "text",
  addLabel = "Add",
  ...field
}: Omit<FieldProps, "children" | "nested"> & { max: number; placeholder?: string; lang?: Lang; type?: "text" | "url"; addLabel?: string }) {
  const { get, set } = useForm()
  const items = (get(field.path) as string[] | undefined) ?? []
  const view = items.length ? items : [""]
  return (
    <Field {...field} nested>
      <div id={fieldId(field.path)} className="flex flex-col gap-2">
        {view.map((item, i) => (
          <div key={i} className="flex gap-2">
            <Input
              type={type}
              value={item}
              placeholder={placeholder}
              onChange={(e) => set(field.path, view.map((x, j) => (j === i ? e.target.value : x)))}
              lang={lang}
              dir={lang ? textDir(lang) : undefined}
              className="h-9"
              aria-label={`${typeof field.label === "string" ? field.label : "Item"} ${i + 1}`}
            />
            {view.length > 1 && (
              <Button type="button" variant="ghost" size="icon" onClick={() => set(field.path, view.filter((_, j) => j !== i))} aria-label="Remove">
                <XIcon />
              </Button>
            )}
          </div>
        ))}
        {view.length < max && (
          <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => set(field.path, [...view, ""])}>
            <PlusIcon data-icon="inline-start" /> {addLabel}
          </Button>
        )}
      </div>
    </Field>
  )
}

/** Repeating groups of fields (founders, products, positions…). */
export function Repeater<T>({
  path,
  label,
  hint,
  max,
  min = 0,
  addLabel,
  newItem,
  itemTitle,
  children,
}: {
  path: string
  label: string
  hint?: ReactNode
  max: number
  min?: number
  addLabel: string
  newItem: () => T
  itemTitle: (item: T, index: number) => string
  children: (itemPath: string, index: number, item: T) => ReactNode
}) {
  const { get, set, errors } = useForm()
  const items = (get(path) as T[] | undefined) ?? []
  const own = errors(path).filter((e) => !/^[\w.]+\[\d+\]/.test(e))
  const move = (from: number, to: number) => {
    const copy = [...items]
    const [x] = copy.splice(from, 1)
    copy.splice(to, 0, x)
    set(path, copy)
  }
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h3 className="font-medium">{label}</h3>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
        {own.map((e) => (
          <p key={e} className="text-xs text-destructive" role="alert">
            {withoutPath(e)}
          </p>
        ))}
      </div>
      {items.map((item, i) => (
        <div key={(item as { _uid?: string })?._uid ?? i} className="flex flex-col gap-4 rounded-xl border p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="min-w-0 truncate text-sm font-medium text-muted-foreground">{itemTitle(item, i)}</p>
            <div className="flex shrink-0 gap-1">
              <Button type="button" variant="ghost" size="icon-sm" disabled={i === 0} onClick={() => move(i, i - 1)} aria-label="Move up">
                <ArrowUpIcon />
              </Button>
              <Button type="button" variant="ghost" size="icon-sm" disabled={i === items.length - 1} onClick={() => move(i, i + 1)} aria-label="Move down">
                <ArrowDownIcon />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={items.length <= min}
                onClick={() => set(path, items.filter((_, j) => j !== i))}
                aria-label="Remove"
              >
                <Trash2Icon />
              </Button>
            </div>
          </div>
          {children(`${path}.${i}`, i, item)}
        </div>
      ))}
      {items.length < max && (
        <Button type="button" variant="outline" className="w-fit" onClick={() => set(path, [...items, newItem()])}>
          <PlusIcon data-icon="inline-start" /> {addLabel}
        </Button>
      )}
    </section>
  )
}

/** A box that must be ticked (consent, permission to name a client). Stores true or nothing. */
export function Confirm({ path, label, hint }: { path: string; label: ReactNode; hint?: ReactNode }) {
  const { get, set, errors, touch } = useForm()
  const list = errors(path)
  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-start gap-2.5 text-sm">
        <Checkbox
          id={fieldId(path)}
          checked={get(path) === true}
          onCheckedChange={(v) => {
            set(path, v === true ? true : undefined)
            touch(path)
          }}
          aria-invalid={list.length > 0 || undefined}
          className="mt-0.5"
        />
        <span className="flex flex-col gap-0.5">
          <span>{label}</span>
          {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
        </span>
      </label>
      {list.map((e) => (
        <p key={e} className="ps-6.5 text-xs text-destructive" role="alert">
          {withoutPath(e)}
        </p>
      ))}
    </div>
  )
}

export function Grid({ children, cols = 2 }: { children: ReactNode; cols?: 2 | 3 }) {
  return <div className={cn("grid gap-4", cols === 3 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2")}>{children}</div>
}

export function Group({ title, hint, children }: { title: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t pt-5 first:border-t-0 first:pt-0">
      <div className="flex flex-col gap-1">
        <h3 className="font-medium">{title}</h3>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  )
}
