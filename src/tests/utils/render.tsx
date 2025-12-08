/**
 * Custom render utilities for React Testing Library
 * Provides pre-configured wrappers with providers
 */

import { type ReactElement, type ReactNode } from 'react'
import { render, type RenderOptions, type RenderResult } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ============================================================================
// Query Client for Tests
// ============================================================================

/**
 * Create a fresh QueryClient for each test
 * Configured with defaults suitable for testing
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Disable retries in tests for faster failures
        retry: false,
        // Disable automatic refetching
        refetchOnWindowFocus: false,
        // Treat data as stale immediately in tests
        staleTime: 0,
        // Disable garbage collection in tests
        gcTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

// ============================================================================
// Provider Wrappers
// ============================================================================

interface TestProvidersProps {
  children: ReactNode
  queryClient?: QueryClient
}

/**
 * Wrapper component with all necessary providers for testing
 */
export function TestProviders({
  children,
  queryClient = createTestQueryClient(),
}: TestProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

// ============================================================================
// Custom Render Functions
// ============================================================================

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient
}

/**
 * Custom render function that wraps component with all providers
 * Use this instead of @testing-library/react's render
 */
export function customRender(
  ui: ReactElement,
  options: CustomRenderOptions = {}
): RenderResult & { queryClient: QueryClient } {
  const { queryClient = createTestQueryClient(), ...renderOptions } = options

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <TestProviders queryClient={queryClient}>
      {children}
    </TestProviders>
  )

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  }
}

/**
 * Re-export everything from @testing-library/react
 * with customRender as the default render
 */
export * from '@testing-library/react'
export { customRender as render }

// ============================================================================
// Hook Testing Utilities
// ============================================================================

import { renderHook, type RenderHookOptions, type RenderHookResult } from '@testing-library/react'

interface CustomRenderHookOptions<TProps> extends Omit<RenderHookOptions<TProps>, 'wrapper'> {
  queryClient?: QueryClient
}

/**
 * Custom renderHook function that wraps hook with all providers
 * Use this for testing hooks that depend on context
 */
export function customRenderHook<TResult, TProps>(
  hook: (props: TProps) => TResult,
  options: CustomRenderHookOptions<TProps> = {}
): RenderHookResult<TResult, TProps> & { queryClient: QueryClient } {
  const { queryClient = createTestQueryClient(), ...hookOptions } = options

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <TestProviders queryClient={queryClient}>
      {children}
    </TestProviders>
  )

  return {
    ...renderHook(hook, { wrapper: Wrapper, ...hookOptions }),
    queryClient,
  }
}

export { customRenderHook as renderHook }

