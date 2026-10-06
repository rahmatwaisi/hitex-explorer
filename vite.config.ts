import { execFileSync } from 'node:child_process'
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

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), communityProfiles()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})
