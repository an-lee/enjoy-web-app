/**
 * useTranscriptDisplay Hook
 *
 * Manages transcript loading, selection, and state for the transcript display component.
 * Handles primary and secondary transcript synchronization with playback.
 */

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useTranscriptsByTarget } from '@/hooks/queries'
import { useTranscriptSync } from '@/hooks/use-transcript-sync'
import { usePlayerStore } from '@/stores/player'
import type { Transcript, TargetType } from '@/types/db'
import type {
  TranscriptLineState,
  SelectedTranscripts,
  UseTranscriptDisplayReturn,
} from './types'

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
  currentTimeSeconds: number
): UseTranscriptDisplayReturn {
  const currentSession = usePlayerStore((state) => state.currentSession)

  // Selected languages
  const [primaryLanguage, setPrimaryLanguageState] = useState<string | null>(
    null
  )
  const [secondaryLanguage, setSecondaryLanguageState] = useState<string | null>(
    null
  )

  // Determine target type and ID from current session
  const targetType: TargetType | null = currentSession
    ? currentSession.mediaType === 'video'
      ? 'Video'
      : 'Audio'
    : null
  const targetId = currentSession?.mediaId ?? null

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

  // Process lines with state
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
        isActive: false, // Will be updated below
        isPast: currentTimeSeconds >= endTimeSeconds,
        startTimeSeconds,
        endTimeSeconds,
      }
    })
  }, [transcripts.primary, transcripts.secondary, alignment, currentTimeSeconds])

  // Find active line index
  const activeLineIndex = useMemo(() => {
    return findActiveLineIndex(lines, currentTimeSeconds)
  }, [lines, currentTimeSeconds])

  // Update isActive state
  const linesWithActiveState = useMemo(() => {
    return lines.map((line, index) => ({
      ...line,
      isActive: index === activeLineIndex,
    }))
  }, [lines, activeLineIndex])

  // Language setters
  const setPrimaryLanguage = useCallback((language: string) => {
    setPrimaryLanguageState(language)
  }, [])

  const setSecondaryLanguage = useCallback((language: string | null) => {
    setSecondaryLanguageState(language)
  }, [])

  return {
    lines: linesWithActiveState,
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

