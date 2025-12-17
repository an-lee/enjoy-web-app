/**
 * Recording Query Hooks - React Query hooks for Recording entity
 */

import { useEffect, useState, useCallback, useRef } from 'react'
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

  const [recordings, setRecordings] = useState<RecordingWithUrl[]>([])

  // Track the previous recordingList length to avoid unnecessary processing
  const prevRecordingListRef = useRef<Recording[]>([])

  useEffect(() => {
    // Skip if recordingList hasn't actually changed (same reference or same content)
    if (
      recordingList === prevRecordingListRef.current ||
      (recordingList.length === 0 && prevRecordingListRef.current.length === 0)
    ) {
      return
    }

    // Check if content is actually different by comparing IDs
    const prevIds = new Set(prevRecordingListRef.current.map((r) => r.id))
    const currentIds = new Set(recordingList.map((r) => r.id))
    const isSameContent =
      prevIds.size === currentIds.size &&
      recordingList.every((r) => prevIds.has(r.id))

    if (isSameContent && recordings.length > 0) {
      prevRecordingListRef.current = recordingList
      return
    }

    prevRecordingListRef.current = recordingList

    let mounted = true
    const urlsToRevoke: string[] = []

    // Revoke old URLs before creating new ones
    recordings.forEach((r) => {
      urlsToRevoke.push(r.audioUrl)
    })

    createRecordingsWithUrls(recordingList).then((results) => {
      if (mounted) {
        // Revoke old URLs now that we have new ones
        urlsToRevoke.forEach((url) => {
          URL.revokeObjectURL(url)
        })
        setRecordings(results)
      } else {
        // Component unmounted, revoke the newly created URLs
        results.forEach((r) => {
          URL.revokeObjectURL(r.audioUrl)
        })
      }
    })

    return () => {
      mounted = false
    }
  }, [recordingList, recordings])

  // Cleanup all URLs on unmount
  useEffect(() => {
    return () => {
      recordings.forEach((r) => {
        URL.revokeObjectURL(r.audioUrl)
      })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

