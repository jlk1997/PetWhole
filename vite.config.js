import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import { resolve } from 'path'
import disableSSRPlugin from './plugins/disable-ssr'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    disableSSRPlugin(),
    uni()
  ],
  build: {
    target: 'es2015',
    minify: 'terser',
    sourcemap: false
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
      'src': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://49.235.65.37:5000',
        changeOrigin: true
      },
      '/vetmew-api': {
        target: 'https://platformx.vetmew.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/vetmew-api/, ''),
        secure: false,
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('代理请求:', req.method, req.url);
          });
          
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('代理响应:', proxyRes.statusCode, req.url);
            console.log('响应头:', proxyRes.headers);
            
            if (proxyRes.headers['content-type']) {
              console.log('内容类型:', proxyRes.headers['content-type']);
            }
          });
          
          proxy.on('error', (err, req, res) => {
            console.error('代理错误:', err);
          });
        }
      }
    }
  },
  optimizeDeps: {
    exclude: ['@dcloudio/uni-app', '@dcloudio/uni-ui']
  }
}) 