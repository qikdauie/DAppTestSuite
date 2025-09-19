import { defineConfig } from 'vite';
import reactRefresh from '@vitejs/plugin-react-refresh';

export default defineConfig({
  plugins: [reactRefresh()],
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