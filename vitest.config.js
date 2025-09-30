import { defineConfig } from 'vitest/config';
import { resolve as pathResolve } from 'node:path';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: [
      pathResolve(__dirname, 'test/setup.js'),
      pathResolve(__dirname, 'submodules/decent_app_sdk/test/setup.js')
    ],
    include: [
      'src/tests/**/*.test.{js,jsx,ts,tsx}',
      'submodules/decent_app_sdk/src/**/*.test.{js,jsx,ts,tsx}'
    ],
    // Exclude only UI-triggered browser runs and browser-only test suffixes
    exclude: [
      'node_modules',
      'dist',
      'src/tests/client/**',
      'src/tests/service-worker/**',
      'src/tests/protocols/**',
      'src/tests/utils/**',
      '**/*.browser.test.{js,jsx,ts,tsx}'
    ]
  },
  resolve: {
    preserveSymlinks: true,
    alias: [
      { find: /^decent_app_sdk\/service-worker$/, replacement: pathResolve(__dirname, 'submodules/decent_app_sdk/src/service-worker/index.js') },
      { find: /^decent_app_sdk\/client$/, replacement: pathResolve(__dirname, 'submodules/decent_app_sdk/src/client/index.js') },
      { find: /^decent_app_sdk\/singleton$/, replacement: pathResolve(__dirname, 'submodules/decent_app_sdk/src/client/singleton.js') },
      { find: /^decent_app_sdk\/protocols$/, replacement: pathResolve(__dirname, 'submodules/decent_app_sdk/src/protocols/index.js') },
      { find: /^decent_app_sdk\/components$/, replacement: pathResolve(__dirname, 'submodules/decent_app_sdk/src/components/index.js') },
      { find: /^decent_app_sdk\/constants$/, replacement: pathResolve(__dirname, 'submodules/decent_app_sdk/src/constants/index.js') },
      { find: /^decent_app_sdk\/utils$/, replacement: pathResolve(__dirname, 'submodules/decent_app_sdk/src/utils/attachments.js') },
      { find: /^decent_app_sdk$/, replacement: pathResolve(__dirname, 'submodules/decent_app_sdk/src/client/index.js') },
    ]
  }
});
