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
    setupFiles: ['./src/tests/setup.ts'],
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
        'src/lib/**/*.ts',
        'src/db/**/*.ts',
        'src/stores/**/*.ts',
        'src/hooks/**/*.ts',
        'src/services/**/*.ts',
        'src/components/**/*.tsx',
      ],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/**/*.test.tsx',
        'src/**/*.spec.tsx',
        'src/tests/**/*',
        'src/types/**/*',
        'src/routeTree.gen.ts',
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
