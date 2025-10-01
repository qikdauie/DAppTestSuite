import { defineConfig } from 'vite';
import { resolve as pathResolve } from 'node:path';

export default defineConfig({
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
  build: {
    lib: {
      entry: pathResolve(__dirname, 'src/sw.js'),
      formats: ['es'],
      fileName: () => 'sw'
    },
    rollupOptions: {
      output: { inlineDynamicImports: true }
    },
    emptyOutDir: false
  }
});


