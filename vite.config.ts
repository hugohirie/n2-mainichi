import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    environment: 'node',
    env: { TZ: 'America/Sao_Paulo' },
    setupFiles: ['./src/test-setup.ts'],
  },
});
