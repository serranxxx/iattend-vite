import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { versionCliente } from './src/pages/Funciones/versionCliente.js'

// `docs/funciones/NN-tema.md?cliente` → el texto ya sin lo interno (ver
// versionCliente.js). Se filtra al compilar para que las notas internas de
// los docs no lleguen al bundle de /funciones.
const funcionesCliente = () => ({
  name: 'funciones-cliente',
  load(id) {
    const [archivo, query] = id.split('?')
    if (query !== 'cliente' || !archivo.endsWith('.md')) return null
    this.addWatchFile(archivo)
    return `export default ${JSON.stringify(versionCliente(readFileSync(archivo, 'utf8')))}`
  },
})

export default defineConfig({
  plugins: [react(), funcionesCliente()],
  server: {
    port: 3000,      // 👈 aquí cambias el puerto
    strictPort: true // opcional: si está ocupado, no cambia a otro
  }
})
