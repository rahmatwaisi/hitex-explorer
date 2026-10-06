// Salaries in both currencies: profiles give a salary in USD or IQD; the jobs page shows the
// other currency too (approximately) and compares jobs by their monthly pay.
import { ltr, vocabLabel, type Salary, type Vocab } from "@/lib/community"
import type { Lang } from "@/lib/data"

export type Currency = "USD" | "IQD"
export const CURRENCIES: Currency[] = ["USD", "IQD"]

/**
 * IQD per USD for the "≈" amounts: the Central Bank of Iraq's official rate. Market rates differ,
 * so converted amounts are always marked approximate. Change it here when the rate moves.
 */
export const IQD_PER_USD = 1310

const DEFAULT_HOURS_PER_WEEK = 40
const WEEKS_PER_MONTH = 52 / 12

export const convert = (amount: number, from: Currency, to: Currency) =>
  from === to ? amount : from === "USD" ? amount * IQD_PER_USD : amount / IQD_PER_USD

/** Readable approximate amounts: IQD to the nearest 5,000 or 10,000, USD to the nearest 10. */
function roundApprox(n: number, currency: Currency) {
  const step = currency === "IQD" ? (n >= 1_000_000 ? 10_000 : n >= 100_000 ? 5_000 : 1_000) : n >= 100 ? 10 : 1
  return Math.round(n / step) * step
}

export const money = (n: number, currency: Currency) =>
  currency === "USD" ? `$${n.toLocaleString("en-US")}` : `${n.toLocaleString("en-US")} IQD`

/** The amounts of a range or fixed salary, in its own currency and period. */
function amounts(s: Salary | null | undefined): { min: number; max: number; currency: Currency } | null {
  if (!s || (s.currency !== "USD" && s.currency !== "IQD") || typeof s.min !== "number") return null
  if (s.type === "range" && typeof s.max === "number") return { min: s.min, max: s.max, currency: s.currency }
  if (s.type === "fixed") return { min: s.min, max: s.min, currency: s.currency }
  return null
}

/** "≈ 1,050,000–1,570,000 IQD / month" for a USD salary, "≈ $760 / month" for an IQD one. */
export function convertedSalary(s: Salary | null | undefined, vocab: Vocab, lang: Lang): string {
  const a = amounts(s)
  if (!a) return ""
  const to: Currency = a.currency === "USD" ? "IQD" : "USD"
  const min = roundApprox(convert(a.min, a.currency, to), to)
  const max = roundApprox(convert(a.max, a.currency, to), to)
  const text =
    min === max
      ? money(min, to)
      : to === "USD"
        ? `$${min.toLocaleString("en-US")}–${max.toLocaleString("en-US")}`
        : `${min.toLocaleString("en-US")}–${max.toLocaleString("en-US")} IQD`
  const period = vocabLabel(vocab, "salary_periods", s?.period, lang)
  return `≈ ${ltr(text)}${period ? ` / ${period}` : ""}`
}

/**
 * The most a job pays per month, in the given currency, for comparing jobs. Yearly pay is split
 * over 12 months, hourly pay assumes the company's hours per week (40 if not given); project
 * pay and salaries without an amount can't be compared and give null.
 */
export function monthlyMax(s: Salary | null | undefined, currency: Currency, hoursPerWeek?: number | null): number | null {
  const a = amounts(s)
  if (!a) return null
  const perMonth =
    s?.period === "month"
      ? a.max
      : s?.period === "year"
        ? a.max / 12
        : s?.period === "hour"
          ? a.max * (hoursPerWeek || DEFAULT_HOURS_PER_WEEK) * WEEKS_PER_MONTH
          : null
  return perMonth === null ? null : convert(perMonth, a.currency, currency)
}
