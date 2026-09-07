/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // GitHub Pages serveert de build vanaf /Verbouwplanning/, niet vanaf de domeinroot — zonder
  // deze base zouden alle asset-paden na `vite build` 404'en. Alleen voor de build, zodat
  // `npm run dev` gewoon op localhost:5173/ blijft draaien zoals voorheen.
  base: command === 'build' ? '/Verbouwplanning/' : '/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.ts'],
  },
}))
