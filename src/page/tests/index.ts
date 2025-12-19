/**
 * Test Infrastructure Index
 *
 * This module exports all testing utilities, mocks, and helpers
 * for use in test files throughout the project.
 *
 * Usage:
 * ```typescript
 * import { render, renderHook, vi } from '@/tests/utils'
 * import { createMockTranslation, resetMockDatabase } from '@/tests/mocks'
 * ```
 */

// Re-export all utilities
export * from './utils'

// Re-export all mocks
export * from './mocks'

// Re-export setup utilities
export { waitForAsync, createDeferred } from './setup'

