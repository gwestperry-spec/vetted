import { defineConfig, loadEnv } from 'vite'
import { resolve } from 'node:path'
import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'

// Inject version from package.json so the About panel and any other UI
// surface showing the running build always matches what's actually shipped.
const pkg = JSON.parse(readFileSync(resolve(import.meta.dirname, 'package.json'), 'utf8'))

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    plugins: [react()],
    // Load .env.preview when VITE_PREVIEW_MODE flag file exists
    envPrefix: 'VITE_',
    build: {
      // The static landing page (design/landing/Landing Page.html) ships its
      // own asset bundle at /assets/. Move Vite's hashed SPA bundle to
      // /_assets/ so the two don't collide.
      assetsDir: '_assets',
      // Multi-page build:
      //   index.html      → React SPA (postbuild moves it to dist/app/index.html)
      //   dashboard.html  → internal KPI dashboard (postbuild moves to dist/dashboard/)
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          dashboard: resolve(__dirname, 'dashboard.html'),
        },
      },
    },
  }
})
