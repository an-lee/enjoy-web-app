/**
 * Global test setup file
 * Configures testing environment and mocks
 */

import { beforeAll, afterAll, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// ============================================================================
// Mock Browser APIs
// ============================================================================

// Mock window.matchMedia for theme/responsive tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock ResizeObserver
class ResizeObserverMock {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: ResizeObserverMock,
})

// Mock IntersectionObserver
class IntersectionObserverMock {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
  root = null
  rootMargin = ''
  thresholds = []
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: IntersectionObserverMock,
})

// Mock scrollTo
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: vi.fn(),
})

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
    get length() {
      return Object.keys(store).length
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock,
})

// Mock Web Crypto API for UUID generation
const cryptoMock = {
  subtle: {
    digest: vi.fn().mockImplementation(async (algorithm: string, _data: ArrayBuffer) => {
      // Return a consistent mock hash for testing
      const length = algorithm === 'SHA-256' ? 32 : 16
      return new ArrayBuffer(length)
    }),
  },
  randomUUID: () => crypto.randomUUID(), // Use actual implementation if available
  getRandomValues: <T extends ArrayBufferView>(array: T): T => {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      return crypto.getRandomValues(array)
    }
    // Fallback for environments without crypto
    const bytes = new Uint8Array(array.buffer)
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256)
    }
    return array
  },
}

// Only mock if not already defined
if (typeof window.crypto === 'undefined') {
  Object.defineProperty(window, 'crypto', {
    value: cryptoMock,
  })
}

// ============================================================================
// Mock i18n
// ============================================================================

vi.mock('@/lib/i18n', () => ({
  default: {
    changeLanguage: vi.fn().mockResolvedValue(undefined),
    language: 'en',
    t: (key: string) => key,
    use: vi.fn().mockReturnThis(),
    init: vi.fn().mockResolvedValue(undefined),
  },
}))

// ============================================================================
// Test Lifecycle Hooks
// ============================================================================

beforeAll(() => {
  // Clear all mocks before test suite
  vi.clearAllMocks()
})

afterEach(() => {
  // Cleanup React Testing Library after each test
  cleanup()
  // Clear localStorage between tests
  localStorageMock.clear()
  // Clear all mock call history
  vi.clearAllMocks()
})

afterAll(() => {
  // Restore all mocks after test suite
  vi.restoreAllMocks()
})

// ============================================================================
// Global Test Utilities
// ============================================================================

/**
 * Wait for async operations to complete
 */
export const waitForAsync = () => new Promise((resolve) => setTimeout(resolve, 0))

/**
 * Create a deferred promise for testing async flows
 */
export function createDeferred<T>() {
  let resolve: (value: T) => void
  let reject: (reason?: unknown) => void

  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })

  return {
    promise,
    resolve: resolve!,
    reject: reject!,
  }
}

