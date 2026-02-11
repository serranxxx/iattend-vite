import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,      // 👈 aquí cambias el puerto
    strictPort: true // opcional: si está ocupado, no cambia a otro
  }
})
