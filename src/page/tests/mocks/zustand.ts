/**
 * Zustand testing utilities
 * Provides helpers for testing Zustand stores
 */

import { act } from '@testing-library/react'
import type { StateCreator, StoreApi } from 'zustand'
import { createStore } from 'zustand/vanilla'

// ============================================================================
// Store Reset Utilities
// ============================================================================

/**
 * Initial states for resetting stores
 */
const initialStates = new Map<StoreApi<unknown>, unknown>()

/**
 * Register a store's initial state for reset capability
 */
export function registerStoreInitialState<T>(store: StoreApi<T>, initialState: T) {
  initialStates.set(store as StoreApi<unknown>, initialState)
}

/**
 * Reset a specific store to its initial state
 */
export function resetStore<T extends object>(store: StoreApi<T>) {
  const initialState = initialStates.get(store as StoreApi<unknown>) as T
  if (initialState) {
    act(() => {
      store.setState(initialState, true)
    })
  }
}

/**
 * Reset all registered stores to their initial states
 */
export function resetAllStores() {
  initialStates.forEach((initialState, store) => {
    act(() => {
      store.setState(initialState as object, true)
    })
  })
}

// ============================================================================
// Store Creation Helpers
// ============================================================================

/**
 * Create a test-friendly store that can be easily reset
 * Use this in place of the original store in tests
 */
export function createTestStore<T extends object>(
  createState: StateCreator<T>,
  initialState?: Partial<T>
): StoreApi<T> & { reset: () => void } {
  const store = createStore<T>(createState)
  const originalState = { ...store.getState(), ...initialState }

  // Register for global reset
  registerStoreInitialState(store, originalState)

  return {
    ...store,
    reset: () => {
      act(() => {
        store.setState(originalState, true)
      })
    },
  }
}

// ============================================================================
// Mock Store Factory
// ============================================================================

/**
 * Create a mock store with predefined state
 * Useful for testing components that consume stores
 */
export function createMockStore<T extends object>(
  state: T
): StoreApi<T> & { reset: () => void } {
  const store = createStore<T>(() => state)
  const initialState = { ...state }

  return {
    ...store,
    reset: () => {
      act(() => {
        store.setState(initialState, true)
      })
    },
  }
}

// ============================================================================
// Settings Store Mock
// ============================================================================

import type { AIProvider } from '@/ai/types'

interface MockSettingsState {
  preferredLanguage: string
  nativeLanguage: string
  learningLanguage: string
  dailyGoal: number
  aiServices: {
    smartTranslation: {
      defaultProvider: AIProvider
      defaultStyle: string
      localModel?: string
    }
    tts: {
      defaultProvider: AIProvider
      preferredVoice?: string
      localModel?: string
    }
    asr: {
      defaultProvider: AIProvider
      localModel?: string
    }
    smartDictionary: {
      defaultProvider: AIProvider
      localModel?: string
    }
    assessment: {
      defaultProvider: AIProvider
    }
  }
  setPreferredLanguage: (lang: string) => void
  setNativeLanguage: (lang: string) => void
  setLearningLanguage: (lang: string) => void
  setDailyGoal: (goal: number) => void
}

export const defaultMockSettings: Omit<MockSettingsState, 'setPreferredLanguage' | 'setNativeLanguage' | 'setLearningLanguage' | 'setDailyGoal'> = {
  preferredLanguage: 'en',
  nativeLanguage: 'zh',
  learningLanguage: 'en',
  dailyGoal: 30,
  aiServices: {
    smartTranslation: {
      defaultProvider: 'enjoy' as AIProvider,
      defaultStyle: 'natural',
    },
    tts: {
      defaultProvider: 'enjoy' as AIProvider,
    },
    asr: {
      defaultProvider: 'local' as AIProvider,
    },
    smartDictionary: {
      defaultProvider: 'enjoy' as AIProvider,
    },
    assessment: {
      defaultProvider: 'enjoy' as AIProvider,
    },
  },
}

/**
 * Create a mock settings store for testing
 */
export function createMockSettingsStore(overrides: Partial<MockSettingsState> = {}) {
  return createStore<MockSettingsState>((set) => ({
    ...defaultMockSettings,
    ...overrides,
    setPreferredLanguage: (lang: string) => set(() => ({ preferredLanguage: lang })),
    setNativeLanguage: (lang: string) => set(() => ({ nativeLanguage: lang })),
    setLearningLanguage: (lang: string) => set(() => ({ learningLanguage: lang })),
    setDailyGoal: (goal: number) => set(() => ({ dailyGoal: Math.max(0, goal) })),
  }))
}
