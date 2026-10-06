// The keyword highlight colours: Radix Colors scales (src/highlight-colors.css, made by
// scripts/build-highlight-colors.ts). No imports, so the script can read this list too.

/**
 * In the order keywords take them: blue first, then each next colour as far as possible on the colour
 * wheel from the last few, so neighbouring keywords never look alike; the muted bronze, gold and brown
 * come last. One colour per keyword, so this is also the most keywords at a time.
 */
export const HIGHLIGHT_COLORS = [
  "blue", "amber", "pink", "jade", "tomato", "indigo", "yellow", "plum", "teal", "red", "iris", "lime", "cyan",
  "mint", "ruby", "purple", "orange", "sky", "grass", "crimson", "violet", "green", "bronze", "gold", "brown",
] as const

export type HighlightColor = (typeof HIGHLIGHT_COLORS)[number]

export const MAX_KEYWORDS = HIGHLIGHT_COLORS.length

/** CSS variables for one keyword's colour, read by .kw-mark and .kw-chip in index.css */
export const highlightVars = (color: HighlightColor) =>
  Object.fromEntries([3, 4, 5, 7, 8, 9, 12].map((step) => [`--hl-${step}`, `var(--rx-${color}-${step})`]))
