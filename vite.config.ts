import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['@mediapipe/tasks-vision']
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      onwarn(warning, warn) {
        // Suppress sourcemap warnings from dependencies
        if (warning.code === 'SOURCEMAP_ERROR') return
        warn(warning)
      }
    }
  },
  server: {
    sourcemapIgnoreList: () => true
  }
})
