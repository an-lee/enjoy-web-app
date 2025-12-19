/**
 * useTranscriptDisplay Hook
 *
 * Manages transcript loading, selection, and state for the transcript display component.
 * Handles primary and secondary transcript synchronization with playback.
 */

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useTranscriptsByTarget } from '@/page/hooks/queries'
import { useTranscriptSync } from '@/page/hooks/player/use-transcript-sync'
import { usePlayerStore } from '@/page/stores/player'
import type { Transcript, TargetType } from '@/page/types/db'
import type {
  TranscriptLineState,
  SelectedTranscripts,
  UseTranscriptDisplayReturn,
} from '../../components/player/transcript/types'
import { useDisplayTime } from '@/page/hooks/player/use-display-time'

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert milliseconds to seconds
 */
function msToSeconds(ms: number): number {
  return ms / 1000
}

/**
 * Find the active line index based on current time
 */
function findActiveLineIndex(
  lines: TranscriptLineState[],
  currentTimeSeconds: number
): number {
  // Binary search for efficiency with large transcripts
  let left = 0
  let right = lines.length - 1
  let result = -1

  while (left <= right) {
    const mid = Math.floor((left + right) / 2)
    const line = lines[mid]

    if (
      currentTimeSeconds >= line.startTimeSeconds &&
      currentTimeSeconds < line.endTimeSeconds
    ) {
      return mid
    }

    if (currentTimeSeconds < line.startTimeSeconds) {
      right = mid - 1
    } else {
      result = mid // Keep track of the last line before current time
      left = mid + 1
    }
  }

  return result
}

/**
 * Align secondary transcript lines with primary transcript lines
 * Uses start time matching with tolerance
 */
function alignTranscripts(
  primary: Transcript,
  secondary: Transcript | null
): Map<number, number> {
  const alignment = new Map<number, number>()

  if (!secondary) return alignment

  const tolerance = 500 // 500ms tolerance for alignment

  primary.timeline.forEach((primaryLine, primaryIndex) => {
    // Find the closest secondary line
    let bestMatch = -1
    let bestDiff = Infinity

    secondary.timeline.forEach((secondaryLine, secondaryIndex) => {
      const diff = Math.abs(primaryLine.start - secondaryLine.start)
      if (diff < tolerance && diff < bestDiff) {
        bestDiff = diff
        bestMatch = secondaryIndex
      }
    })

    if (bestMatch >= 0) {
      alignment.set(primaryIndex, bestMatch)
    }
  })

  return alignment
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useTranscriptDisplay(
): UseTranscriptDisplayReturn {
  const currentTimeSeconds = useDisplayTime();
  const currentSession = usePlayerStore((state) => state.currentSession)

  // Selected languages
  const [primaryLanguage, setPrimaryLanguageState] = useState<string | null>(
    null
  )
  const [secondaryLanguage, setSecondaryLanguageState] = useState<string | null>(
    null
  )

  // Determine target type and ID from current session (memoized to prevent unnecessary re-renders)
  const { targetType, targetId } = useMemo<{
    targetType: TargetType | null
    targetId: string | null
  }>(() => {
    if (!currentSession) {
      return { targetType: null, targetId: null }
    }
    return {
      targetType: (currentSession.mediaType === 'video' ? 'Video' : 'Audio') as TargetType,
      targetId: currentSession.mediaId,
    }
  }, [currentSession?.mediaType, currentSession?.mediaId])

  // Track transcript sync status
  const syncState = useTranscriptSync(targetType, targetId)

  // Fetch all transcripts for the current media
  const {
    data: availableTranscripts = [],
    isLoading,
    error,
  } = useTranscriptsByTarget(targetType, targetId)

  // Auto-select primary language when transcripts are loaded
  useEffect(() => {
    if (availableTranscripts.length > 0 && !primaryLanguage) {
      // Prefer the media's language, then first available
      const mediaLanguage = currentSession?.language
      const matchingTranscript = availableTranscripts.find(
        (t) => t.language === mediaLanguage
      )
      setPrimaryLanguageState(
        matchingTranscript?.language ?? availableTranscripts[0].language
      )
    }
  }, [availableTranscripts, primaryLanguage, currentSession?.language])

  // Get selected transcripts
  const transcripts: SelectedTranscripts = useMemo(() => {
    const primary =
      availableTranscripts.find((t) => t.language === primaryLanguage) ?? null
    const secondary =
      secondaryLanguage
        ? availableTranscripts.find((t) => t.language === secondaryLanguage) ??
          null
        : null

    return {
      primary,
      secondary,
      isLoading,
      error: error ? String(error) : null,
    }
  }, [availableTranscripts, primaryLanguage, secondaryLanguage, isLoading, error])

  // Align primary and secondary transcripts
  const alignment = useMemo(() => {
    if (!transcripts.primary) return new Map<number, number>()
    return alignTranscripts(transcripts.primary, transcripts.secondary)
  }, [transcripts.primary, transcripts.secondary])

  // Process lines with static data only (no time-dependent state)
  // Time-dependent state (isActive, isPast) will be computed in components
  // This avoids recreating the entire array on every time update (4-10 times per second)
  const lines: TranscriptLineState[] = useMemo(() => {
    if (!transcripts.primary) return []

    return transcripts.primary.timeline.map((primaryLine, index) => {
      const startTimeSeconds = msToSeconds(primaryLine.start)
      const endTimeSeconds = msToSeconds(
        primaryLine.start + primaryLine.duration
      )

      // Get aligned secondary line if available
      const secondaryIndex = alignment.get(index)
      const secondaryLine =
        secondaryIndex !== undefined && transcripts.secondary
          ? transcripts.secondary.timeline[secondaryIndex]
          : undefined

      return {
        index,
        primary: primaryLine,
        secondary: secondaryLine,
        // Time-dependent state will be computed in components for better performance
        // This prevents recreating the entire array on every time update
        isActive: false,
        isPast: false,
        startTimeSeconds,
        endTimeSeconds,
      }
    })
  }, [transcripts.primary, transcripts.secondary, alignment])

  // Find active line index (still needed for auto-scroll and other features)
  const activeLineIndex = useMemo(() => {
    return findActiveLineIndex(lines, currentTimeSeconds)
  }, [lines, currentTimeSeconds])

  // Language setters
  const setPrimaryLanguage = useCallback((language: string) => {
    setPrimaryLanguageState(language)
  }, [])

  const setSecondaryLanguage = useCallback((language: string | null) => {
    setSecondaryLanguageState(language)
  }, [])

  return {
    lines,
    activeLineIndex,
    transcripts,
    availableTranscripts,
    setPrimaryLanguage,
    setSecondaryLanguage,
    primaryLanguage,
    secondaryLanguage,
    syncState: {
      isSyncing: syncState.isSyncing,
      hasSynced: syncState.hasSynced,
      error: syncState.error,
      syncTranscripts: syncState.syncTranscripts,
    },
  }
}

