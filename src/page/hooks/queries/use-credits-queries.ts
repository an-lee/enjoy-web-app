/**
 * Credits Query Hooks - React Query hooks for credits usage logs
 */

import { useQuery } from '@tanstack/react-query'
import { getEnjoyClient, type GetCreditsUsageLogsParams } from '@/page/ai/providers/enjoy/client'

// ============================================================================
// Types
// ============================================================================

export interface UseCreditsUsageLogsOptions extends GetCreditsUsageLogsParams {
  enabled?: boolean
}

// ============================================================================
// Query Keys Factory
// ============================================================================

export const creditsQueryKeys = {
  all: ['credits'] as const,
  usageLogs: (params: GetCreditsUsageLogsParams) =>
    [...creditsQueryKeys.all, 'usageLogs', params] as const,
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Hook for fetching credits usage logs
 */
export function useCreditsUsageLogs(options: UseCreditsUsageLogsOptions = {}) {
  const { enabled = true, ...params } = options

  return useQuery({
    queryKey: creditsQueryKeys.usageLogs(params),
    queryFn: () => getEnjoyClient().getCreditsUsageLogs(params),
    enabled,
    staleTime: 1000 * 30, // Cache for 30 seconds
  })
}

