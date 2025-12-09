import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['@mediapipe/tasks-vision']
  },
  build: {
    sourcemap: false
  },
  server: {
    port: 1573,
    host: 'localhost',
    sourcemapIgnoreList: () => true,
    hmr: {
      overlay: false
    }
  },
  preview: {
    port: 1572,
    host: 'localhost'
  },
  logLevel: 'info',
  clearScreen: false
})
