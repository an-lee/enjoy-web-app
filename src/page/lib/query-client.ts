import { QueryClient } from '@tanstack/react-query'
import { createLogger } from '../../shared/lib/utils'

// ============================================================================
// Logger
// ============================================================================

const log = createLogger({ name: 'query-client' })

/**
 * Creates and configures a QueryClient instance with best practices.
 *
 * Default options:
 * - staleTime: 5 minutes - Data is considered fresh for 5 minutes
 * - gcTime: 10 minutes - Unused data is garbage collected after 10 minutes
 * - retry: 3 - Retry failed requests up to 3 times
 * - refetchOnWindowFocus: true - Refetch when window regains focus
 * - refetchOnReconnect: true - Refetch when network reconnects
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
        retry: 3,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        refetchOnMount: true,
      },
      mutations: {
        retry: 1,
        onError: (error) => {
          // Global error handler for mutations
          log.error('Mutation error:', error)
        },
      },
    },
  })
}

