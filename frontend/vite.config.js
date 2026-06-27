import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Higher inline limit reduces tiny separate asset requests.
    assetsInlineLimit: 4096,
    cssCodeSplit: true,
    // Drop console.log in prod for smaller bundles.
    minify: 'esbuild',
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Split heavy libs into separate cached chunks so users only re-download
        // app code on updates, not the whole vendor stack.
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-ui': ['lucide-react', 'react-hot-toast'],
          'vendor-data': ['axios', 'xlsx'],
        },
      },
    },
  },
  esbuild: {
    drop: ['console', 'debugger'],
  },
  server: {
    port: 3000,
    host: true,
  },
  preview: {
    host: true,
    allowedHosts: true,
  },
})
