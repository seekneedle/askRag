import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.')
          const extType = info[info.length - 1]
          if (/\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/i.test(assetInfo.name)) {
            return `assets/media/[name].[hash][extname]`
          }
          else if (/\.(png|jpe?g|gif|svg|webp|ico)(\?.*)?$/i.test(assetInfo.name)) {
            return `assets/img/[name].[hash][extname]`
          }
          else if (/\.(woff2?|eot|ttf|otf)(\?.*)?$/i.test(assetInfo.name)) {
            return `assets/fonts/[name].[hash][extname]`
          }
          return `assets/[name].[hash][extname]`
        },
        chunkFileNames: 'assets/js/[name].[hash].js',
        entryFileNames: 'assets/js/[name].[hash].js',
      }
    }
  },
  server: {
    proxy: {
      '/user/login': {
        target: 'http://8.152.213.191:8989',
        changeOrigin: true,
        rewrite: (path) => {
          return path;
          //console.log('Proxy rewriting path:', path);
          //return path.replace(/^\/user/, '');
        },
        // Add these for more debugging
        secure: false,
        ws: true,
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Proxying request:', {
              method: req.method,
              url: req.url,
              headers: req.headers
            });
          });
        }
      },
      '/vector_store/query': {
        target: 'https://kb.uuxlink.com',
        changeOrigin: true
      },

      '/vector_store/stream_query': {
        target: 'https://kb.uuxlink.com',
        changeOrigin: true
      },
      '/api/v1/tts': {
        target: 'https://openspeech.bytedance.com',
        changeOrigin: true
      }
    },
    headers: {
      'Referrer-Policy': 'no-referrer-when-downgrade'
    }
  }
})