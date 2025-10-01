import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve as pathResolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    preserveSymlinks: true,
    alias: [
      { find: /^decent_app_sdk\/service-worker$/, replacement: pathResolve(__dirname, 'submodules/decent_app_sdk/src/service-worker/index.js') },
      { find: /^decent_app_sdk\/client$/, replacement: pathResolve(__dirname, 'submodules/decent_app_sdk/src/client/index.js') },
      { find: /^decent_app_sdk\/singleton$/, replacement: pathResolve(__dirname, 'submodules/decent_app_sdk/src/client/singleton.js') },
      { find: /^decent_app_sdk\/protocols$/, replacement: pathResolve(__dirname, 'submodules/decent_app_sdk/src/protocols/index.js') },
      { find: /^decent_app_sdk\/components$/, replacement: pathResolve(__dirname, 'submodules/decent_app_sdk/src/components/index.js') },
      { find: /^decent_app_sdk\/constants$/, replacement: pathResolve(__dirname, 'submodules/decent_app_sdk/src/constants/index.js') },
      { find: /^decent_app_sdk$/, replacement: pathResolve(__dirname, 'submodules/decent_app_sdk/src/client/index.js') },
    ]
  },
  
  server: {
    open: false,
    host: true,
    port: 3000,
  },
  preview: {
    allowedHosts: ['localhost', '127.0.0.1', 'hammerhead-dapp-pyfch.ondigitalocean.app'],
    open: false,
    host: true,
    port: 8080,
  },
  build: {
    rollupOptions: {
      input: {
        main: pathResolve(__dirname, 'index.html'),
      },
      output: {
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]'
      }
    }
  }
}); 