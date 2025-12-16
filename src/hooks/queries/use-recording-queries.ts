/**
 * Recording Query Hooks - React Query hooks for Recording entity
 */

import { useEffect, useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getRecordingsByEchoRegion } from '@/db'
import type { Recording, TargetType } from '@/types/db'

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
// Types
// ============================================================================

export interface RecordingWithUrl {
  recording: Recording
  audioUrl: string
}

// ============================================================================
// Helper Functions
// ============================================================================

async function createRecordingUrl(recording: Recording): Promise<string | null> {
  if (!recording.blob) return null
  try {
    return URL.createObjectURL(recording.blob)
  } catch {
    return null
  }
}

async function createRecordingsWithUrls(
  recordings: Recording[]
): Promise<RecordingWithUrl[]> {
  const results = await Promise.all(
    recordings.map(async (recording) => {
      const audioUrl = await createRecordingUrl(recording)
      if (!audioUrl) return null
      return { recording, audioUrl }
    })
  )
  return results
    .filter((item): item is RecordingWithUrl => item !== null)
    .sort((a, b) => {
      // Sort by createdAt descending (newest first)
      const dateA = a.recording.createdAt || ''
      const dateB = b.recording.createdAt || ''
      return dateB.localeCompare(dateA)
    })
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
  recordings: RecordingWithUrl[]
  isLoading: boolean
  isError: boolean
  error: Error | null
  refetch: () => Promise<void>
}

/**
 * Hook for fetching recordings that match an echo region
 * Automatically handles blob URL creation and cleanup
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
      startTime,
      endTime
    ),
    queryFn: () =>
      getRecordingsByEchoRegion(targetType, targetId, language, startTime, endTime),
    enabled: enabled && !!targetId && !!language,
    staleTime: 1000 * 30,
  })

  const [recordings, setRecordings] = useState<RecordingWithUrl[]>([])

  useEffect(() => {
    let mounted = true
    let urls: string[] = []

    createRecordingsWithUrls(recordingList).then((results) => {
      if (mounted) {
        urls = results.map((r) => r.audioUrl)
        setRecordings(results)
      }
    })

    return () => {
      mounted = false
      urls.forEach((url) => {
        URL.revokeObjectURL(url)
      })
    }
  }, [recordingList])

  const refetch = useCallback(async () => {
    await refetchQuery()
  }, [refetchQuery])

  return {
    recordings,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  }
}

