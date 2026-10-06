// Names of profile files and pages. Kept apart from profile-rules.ts so pages that only need
// these don't load the YAML parser.

/** snake_case from a name, for slugs and ids. */
export const snakeCase = (name: string) =>
  name
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")

/** yyyymmdd_hhmmss in UTC, the start of a profile file name. */
export const fileStamp = (d = new Date()) => d.toISOString().replace(/[-:]/g, "").replace("T", "_").slice(0, 15)
