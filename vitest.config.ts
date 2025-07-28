import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // CI環境では評価テストをスキップするための設定
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      ...(process.env.CI ? ['**/*.eval.test.ts'] : []),
    ],
  },
});