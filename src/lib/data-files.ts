// Loads the JSON files of public/data quickly:
// - each file is fetched once per visit and shared, so moving between pages needs no network;
// - in production every deploy also publishes the files at /data/v/<version>/ (vite.config.ts), which
//   browsers may keep for a year (netlify.toml), so returning visitors read them from their device.

const plain = (file: string) => `${import.meta.env.BASE_URL}data/${file}`

/** The address the site loads a data file from: the versioned copy in production. */
export const dataUrl = (file: string) =>
  import.meta.env.DEV ? plain(file) : `${import.meta.env.BASE_URL}data/v/${__DATA_VERSION__}/${file}`

const promises = new Map<string, Promise<unknown>>()
const values = new Map<string, unknown>()

/** Runs `load` once per key and shares the result; a failure isn't kept, so the next call tries again. */
export function once<T>(key: string, load: () => Promise<T>): Promise<T> {
  let promise = promises.get(key) as Promise<T> | undefined
  if (!promise) {
    promise = load().then((value) => {
      values.set(key, value)
      return value
    })
    promise.catch(() => promises.delete(key))
    promises.set(key, promise)
  }
  return promise
}

/** What `once(key)` loaded, if it has finished: lets a page render its data at once instead of "Loading…". */
export const peek = <T,>(key: string) => values.get(key) as T | undefined

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url.split("/").pop()}: HTTP ${res.status}`)
  return res.json()
}

/**
 * A data file, fetched once per visit. A tab opened before a new deploy asks for a version that no
 * longer exists; then it falls back to the plain address.
 */
export const fetchData = (file: string) =>
  once(`file:${file}`, () => getJson(dataUrl(file)).catch((e) => (dataUrl(file) === plain(file) ? Promise.reject(e) : getJson(plain(file)))))

export const peekData = <T,>(file: string) => peek<T>(`file:${file}`)
