import { defineConfig } from 'vitest/config';

const strict = { lines: 95, branches: 95, functions: 95 };

export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      exclude: ['src/**/*.d.ts'],
      thresholds: {
        lines: 85,
        branches: 85,
        functions: 85,
        'src/model/**': strict,
        'src/config.ts': strict,
        'src/theme.ts': strict,
      },
    },
  },
});
