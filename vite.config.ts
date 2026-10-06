import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/**
 * In dev, rebuilds public/data/community.json whenever a profile in public/startups/ is added,
 * changed or removed, then reloads the page. Problems in a profile are printed in the terminal.
 */
function communityProfiles(): Plugin {
  const root = import.meta.dirname
  const dir = path.join(root, 'public/startups')
  return {
    name: 'community-profiles',
    apply: 'serve',
    configureServer(server) {
      server.watcher.add(dir)
      const rebuild = (file: string) => {
        if (path.dirname(file) !== dir || !/\.ya?ml$/.test(file)) return
        try {
          execFileSync(process.execPath, ['scripts/build-community.ts'], { cwd: root, stdio: 'inherit' })
        } catch {
          // the script printed what's wrong; community.json keeps the last valid build
          return
        }
        server.ws.send({ type: 'full-reload' })
      }
      for (const event of ['add', 'change', 'unlink'] as const) server.watcher.on(event, rebuild)
    },
  }
}

/** this build's data version: the commit Netlify deploys, or the build time */
const DATA_VERSION = (process.env.COMMIT_REF ?? Date.now().toString(36)).slice(0, 12)

/**
 * After a build, copies dist/data/*.json to dist/data/v/<version>/, the addresses the site loads them
 * from (src/lib/data-files.ts). Those copies never change, so browsers may keep them (netlify.toml).
 */
function versionedData(): Plugin {
  let outDir = ''
  return {
    name: 'versioned-data',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      const from = path.join(outDir, 'data')
      const to = path.join(from, 'v', DATA_VERSION)
      fs.mkdirSync(to, { recursive: true })
      for (const file of fs.readdirSync(from)) if (file.endsWith('.json')) fs.copyFileSync(path.join(from, file), path.join(to, file))
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), communityProfiles(), versionedData()],
  define: { __DATA_VERSION__: JSON.stringify(DATA_VERSION) },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})
