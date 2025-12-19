import { defineConfig } from 'vitest/config'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import viteReact from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [
    viteReact(),
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
  ] as any,
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/page/tests/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: [
      'node_modules',
      'dist',
      '.idea',
      '.git',
      '.cache',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      include: [
        'src/page/lib/**/*.ts',
        'src/page/db/**/*.ts',
        'src/page/stores/**/*.ts',
        'src/page/hooks/**/*.ts',
        'src/page/ai/services/**/*.ts',
        'src/page/components/**/*.tsx',
        'src/shared/lib/**/*.ts',
        'src/worker/services/**/*.ts',
        'src/worker/utils/**/*.ts',
      ],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/**/*.test.tsx',
        'src/**/*.spec.tsx',
        'src/page/tests/**/*',
        'src/page/types/**/*',
        'src/page/routeTree.gen.ts',
        'src/worker/db/**/*',
      ],
    },
    // Timeout for each test
    testTimeout: 10000,
    // Timeout for hooks like beforeAll
    hookTimeout: 30000,
    // Mock browser APIs
    server: {
      deps: {
        inline: [
          'uuid',
          'zustand',
        ],
      },
    },
  },
  resolve: {
    conditions: ['import', 'module', 'browser', 'default'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
