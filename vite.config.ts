import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Chemins relatifs : le site marche aussi bien a la racine que dans /nom-du-depot/ (GitHub Pages).
  base: './',
})
