import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./vitest.setup.ts'],
      include: ['src/**/*.test.ts?(x)', 'electron/**/*.test.ts?(x)'],
      // slot-text ships ESM with extensionless relative imports that Node's
      // resolver can't follow; let Vite transform it so tests can import it.
      server: { deps: { inline: ['slot-text'] } },
    },
  })
);
