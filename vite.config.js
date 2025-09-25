import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve as pathResolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    preserveSymlinks: true,
    alias: [
      { find: /^decent_app_sdk\/service-worker$/, replacement: pathResolve(__dirname, 'decent_app_sdk/src/service-worker/index.js') },
      { find: /^decent_app_sdk\/client$/, replacement: pathResolve(__dirname, 'decent_app_sdk/src/client/index.js') },
      { find: /^decent_app_sdk\/singleton$/, replacement: pathResolve(__dirname, 'decent_app_sdk/src/client/singleton.js') },
      { find: /^decent_app_sdk\/protocols$/, replacement: pathResolve(__dirname, 'decent_app_sdk/src/protocols/index.js') },
      { find: /^decent_app_sdk\/components$/, replacement: pathResolve(__dirname, 'decent_app_sdk/src/components/index.js') },
      { find: /^decent_app_sdk$/, replacement: pathResolve(__dirname, 'decent_app_sdk/src/client/index.js') },
    ]
  },
  server: {
    open: false,
    host: true,
    port: 3000,
  },
  preview: {
    open: false,
    host: true,
    port: 8080,
  },
}); 