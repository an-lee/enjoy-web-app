/**
 * Recording Query Hooks - React Query hooks for Recording entity
 */

import { useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getRecordingsByEchoRegion } from '@/page/db'
import type { Recording, TargetType } from '@/page/types/db'

// ============================================================================
// Query Keys Factory
// ============================================================================

export const recordingQueryKeys = {
  all: ['recording'] as const,
  detail: (id: string) => [...recordingQueryKeys.all, 'detail', id] as const,
  byEchoRegion: (
    targetType: TargetType,
    targetId: string,
    language: string,
    startTime: number,
    endTime: number
  ) =>
    [
      ...recordingQueryKeys.all,
      'byEchoRegion',
      targetType,
      targetId,
      language,
      startTime,
      endTime,
    ] as const,
}

// ============================================================================
// Query Hooks
// ============================================================================

export interface UseRecordingsByEchoRegionOptions {
  targetType: TargetType
  targetId: string
  language: string
  startTime: number // milliseconds
  endTime: number // milliseconds
  enabled?: boolean
}

export interface UseRecordingsByEchoRegionReturn {
  /** Raw recordings from database (sorted by createdAt descending) */
  recordings: Recording[]
  isLoading: boolean
  isError: boolean
  error: Error | null
  refetch: () => Promise<void>
}

/**
 * Hook for fetching recordings that match an echo region.
 * Returns raw Recording objects - URL creation should be handled by the consumer.
 */
export function useRecordingsByEchoRegion(
  options: UseRecordingsByEchoRegionOptions
): UseRecordingsByEchoRegionReturn {
  const {
    targetType,
    targetId,
    language,
    startTime,
    endTime,
    enabled = true,
  } = options

  // IMPORTANT: Round times to integers to avoid floating point precision issues
  // that would cause queryKey instability and infinite re-renders.
  // Example: 64.68 * 1000 = 64680.00000000001, which would cause queryKey to change
  const stableStartTime = Math.round(startTime)
  const stableEndTime = Math.round(endTime)

  const {
    data: recordingList = [],
    isLoading,
    isError,
    error,
    refetch: refetchQuery,
  } = useQuery({
    queryKey: recordingQueryKeys.byEchoRegion(
      targetType,
      targetId,
      language,
      stableStartTime,
      stableEndTime
    ),
    queryFn: () =>
      getRecordingsByEchoRegion(targetType, targetId, language, stableStartTime, stableEndTime),
    enabled: enabled && !!targetId && !!language,
    staleTime: 1000 * 30,
  })

  // Sort by createdAt descending (newest first)
  const sortedRecordings = useMemo(() => {
    return [...recordingList].sort((a, b) => {
      const dateA = a.createdAt || ''
      const dateB = b.createdAt || ''
      return dateB.localeCompare(dateA)
    })
  }, [recordingList])

  const refetch = useCallback(async () => {
    await refetchQuery()
  }, [refetchQuery])

  return {
    recordings: sortedRecordings,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  }
}

