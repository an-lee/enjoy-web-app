/**
 * useEchoRegion Hook
 *
 * Manages echo region state and operations (expand, shrink, etc.)
 */

import { useCallback, useMemo, useRef, useEffect } from 'react'
import { usePlayerStore } from '@/stores/player'
import { createLogger } from '@/lib/utils'
import type { TranscriptLineState } from './types'

const log = createLogger({ name: 'useEchoRegion' })

export function useEchoRegion(lines: TranscriptLineState[]) {
  const linesRef = useRef<TranscriptLineState[]>([])

  // Update lines ref
  useEffect(() => {
    linesRef.current = lines
  }, [lines])

  // Echo mode state - use separate selectors to prevent object recreation issues
  const echoModeActive = usePlayerStore((state) => state.echoModeActive)
  const echoStartLineIndex = usePlayerStore((state) => state.echoStartLineIndex)
  const echoEndLineIndex = usePlayerStore((state) => state.echoEndLineIndex)
  const echoStartTime = usePlayerStore((state) => state.echoStartTime)
  const echoEndTime = usePlayerStore((state) => state.echoEndTime)
  const updateEchoRegion = usePlayerStore((state) => state.updateEchoRegion)

  // Debug log for echo mode state changes
  useEffect(() => {
    log.debug('Echo mode state changed', {
      echoModeActive,
      echoStartLineIndex,
      echoEndLineIndex,
      echoStartTime,
      echoEndTime,
    })
  }, [echoModeActive, echoStartLineIndex, echoEndLineIndex, echoStartTime, echoEndTime])

  // Get echo region time range from store - memoized to prevent object recreation
  const echoRegionTimeRange = useMemo(
    () =>
      echoModeActive && echoStartTime >= 0 && echoEndTime >= 0
        ? { startTime: echoStartTime, endTime: echoEndTime }
        : null,
    [echoModeActive, echoStartTime, echoEndTime]
  )

  // Handle expand echo region forward
  const handleExpandEchoForward = useCallback(() => {
    log.debug('Expanding echo region forward', {
      echoStartLineIndex,
      echoEndLineIndex,
    })
    const currentLines = linesRef.current
    if (echoEndLineIndex >= 0 && echoEndLineIndex < currentLines.length - 1) {
      const startLine = currentLines[echoStartLineIndex]
      const newEndLine = currentLines[echoEndLineIndex + 1]
      if (startLine && newEndLine) {
        log.debug('Updating echo region forward', {
          newEndLineIndex: echoEndLineIndex + 1,
          newEndTime: newEndLine.endTimeSeconds,
        })
        updateEchoRegion(
          echoStartLineIndex,
          echoEndLineIndex + 1,
          startLine.startTimeSeconds,
          newEndLine.endTimeSeconds
        )
      }
    }
  }, [echoStartLineIndex, echoEndLineIndex, updateEchoRegion])

  // Handle expand echo region backward
  const handleExpandEchoBackward = useCallback(() => {
    log.debug('Expanding echo region backward', {
      echoStartLineIndex,
      echoEndLineIndex,
    })
    const currentLines = linesRef.current
    if (echoStartLineIndex > 0 && echoEndLineIndex >= 0) {
      const newStartLine = currentLines[echoStartLineIndex - 1]
      const endLine = currentLines[echoEndLineIndex]
      if (newStartLine && endLine) {
        log.debug('Updating echo region backward', {
          newStartLineIndex: echoStartLineIndex - 1,
          newStartTime: newStartLine.startTimeSeconds,
        })
        updateEchoRegion(
          echoStartLineIndex - 1,
          echoEndLineIndex,
          newStartLine.startTimeSeconds,
          endLine.endTimeSeconds
        )
      }
    }
  }, [echoStartLineIndex, echoEndLineIndex, updateEchoRegion])

  // Handle shrink echo region forward
  const handleShrinkEchoForward = useCallback(() => {
    log.debug('Shrinking echo region forward', {
      echoStartLineIndex,
      echoEndLineIndex,
    })
    const currentLines = linesRef.current
    if (echoEndLineIndex > echoStartLineIndex && echoStartLineIndex >= 0) {
      const startLine = currentLines[echoStartLineIndex]
      const newEndLine = currentLines[echoEndLineIndex - 1]
      if (startLine && newEndLine) {
        log.debug('Updating echo region shrink forward', {
          newEndLineIndex: echoEndLineIndex - 1,
        })
        updateEchoRegion(
          echoStartLineIndex,
          echoEndLineIndex - 1,
          startLine.startTimeSeconds,
          newEndLine.endTimeSeconds
        )
      }
    }
  }, [echoStartLineIndex, echoEndLineIndex, updateEchoRegion])

  // Handle shrink echo region backward
  const handleShrinkEchoBackward = useCallback(() => {
    log.debug('Shrinking echo region backward', {
      echoStartLineIndex,
      echoEndLineIndex,
    })
    const currentLines = linesRef.current
    if (echoStartLineIndex < echoEndLineIndex && echoEndLineIndex >= 0) {
      const newStartLine = currentLines[echoStartLineIndex + 1]
      const endLine = currentLines[echoEndLineIndex]
      if (newStartLine && endLine) {
        log.debug('Updating echo region shrink backward', {
          newStartLineIndex: echoStartLineIndex + 1,
        })
        updateEchoRegion(
          echoStartLineIndex + 1,
          echoEndLineIndex,
          newStartLine.startTimeSeconds,
          endLine.endTimeSeconds
        )
      }
    }
  }, [echoStartLineIndex, echoEndLineIndex, updateEchoRegion])

  return {
    echoModeActive,
    echoStartLineIndex,
    echoEndLineIndex,
    echoRegionTimeRange,
    handleExpandEchoForward,
    handleExpandEchoBackward,
    handleShrinkEchoForward,
    handleShrinkEchoBackward,
  }
}

