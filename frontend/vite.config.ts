/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 4827,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
    css: true,
    coverage: {
      reporter: ['text', 'json', 'html'],
      include: ['src/hooks/', 'src/store/'],
      exclude: ['src/hooks/*.d.ts', 'src/store/*.d.ts'],
      thresholds: {
        branches: 80,
        statements: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
})
