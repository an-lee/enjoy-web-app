/**
 * useEchoRegion Hook
 *
 * Manages echo region state and operations (expand, shrink, etc.)
 *
 * IMPORTANT: This hook is designed to be called from multiple components.
 * All state comes from the central store to ensure consistency.
 * Side effects (like restoring line indices) should be handled separately
 * by useEchoRegionManager to avoid multiple effects running in parallel.
 */

import { useCallback, useMemo, useRef, useEffect } from 'react'
import { usePlayerStore } from '@/stores/player'
import type { TranscriptLineState } from '../../components/player/transcript/types'

/**
 * Find line index by time (similar to findActiveLineIndex but finds the line that contains or is closest to the time)
 */
export function findLineIndexByTime(
  lines: TranscriptLineState[],
  timeSeconds: number
): number {
  if (lines.length === 0) return -1

  // Binary search for efficiency
  let left = 0
  let right = lines.length - 1
  let result = -1

  while (left <= right) {
    const mid = Math.floor((left + right) / 2)
    const line = lines[mid]

    // Check if time is within this line
    if (
      timeSeconds >= line.startTimeSeconds &&
      timeSeconds < line.endTimeSeconds
    ) {
      return mid
    }

    // Check if time is before this line
    if (timeSeconds < line.startTimeSeconds) {
      right = mid - 1
    } else {
      // Time is after this line, keep track of the last line before time
      result = mid
      left = mid + 1
    }
  }

  // If no exact match, return the closest line
  // If result is -1, time is before all lines, return first line
  if (result < 0) return 0
  // If result is last line and time is after it, return last line
  if (result >= lines.length - 1) return lines.length - 1
  // Otherwise, check which line is closer
  const line1 = lines[result]
  const line2 = lines[result + 1]
  const diff1 = Math.abs(timeSeconds - line1.endTimeSeconds)
  const diff2 = Math.abs(timeSeconds - line2.startTimeSeconds)
  return diff1 < diff2 ? result : result + 1
}

/**
 * Hook for accessing echo region state and operations.
 * Can be safely called from multiple components - all state is centralized in the store.
 *
 * @param lines - Optional transcript lines for expand/shrink operations.
 *                If not provided, expand/shrink operations will be no-ops.
 */
export function useEchoRegion(lines?: TranscriptLineState[]) {
  // Use ref to store lines to avoid stale closures in callbacks
  const linesRef = useRef<TranscriptLineState[]>(lines || [])

  // Update lines ref when lines change
  useEffect(() => {
    linesRef.current = lines || []
  }, [lines])

  // Echo mode state - use separate selectors to prevent object recreation issues
  const echoModeActive = usePlayerStore((state) => state.echoModeActive)
  const echoStartLineIndex = usePlayerStore((state) => state.echoStartLineIndex)
  const echoEndLineIndex = usePlayerStore((state) => state.echoEndLineIndex)
  const echoStartTime = usePlayerStore((state) => state.echoStartTime)
  const echoEndTime = usePlayerStore((state) => state.echoEndTime)
  const updateEchoRegion = usePlayerStore((state) => state.updateEchoRegion)

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
    const currentLines = linesRef.current
    if (currentLines.length === 0) return
    if (echoEndLineIndex >= 0 && echoEndLineIndex < currentLines.length - 1) {
      const startLine = currentLines[echoStartLineIndex]
      const newEndLine = currentLines[echoEndLineIndex + 1]
      if (startLine && newEndLine) {
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
    const currentLines = linesRef.current
    if (currentLines.length === 0) return
    if (echoStartLineIndex > 0 && echoEndLineIndex >= 0) {
      const newStartLine = currentLines[echoStartLineIndex - 1]
      const endLine = currentLines[echoEndLineIndex]
      if (newStartLine && endLine) {
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
    const currentLines = linesRef.current
    if (currentLines.length === 0) return
    if (echoEndLineIndex > echoStartLineIndex && echoStartLineIndex >= 0) {
      const startLine = currentLines[echoStartLineIndex]
      const newEndLine = currentLines[echoEndLineIndex - 1]
      if (startLine && newEndLine) {
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
    const currentLines = linesRef.current
    if (currentLines.length === 0) return
    if (echoStartLineIndex < echoEndLineIndex && echoEndLineIndex >= 0) {
      const newStartLine = currentLines[echoStartLineIndex + 1]
      const endLine = currentLines[echoEndLineIndex]
      if (newStartLine && endLine) {
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

// ============================================================================
// Echo Region Manager Hook
// ============================================================================

import { createLogger } from '@/lib/utils'
import { useTranscriptDisplay } from './use-transcript-display'

const log = createLogger({ name: 'useEchoRegionManager' })

/**
 * Hook for managing echo region side effects.
 * Should only be called ONCE in the component tree (typically in TranscriptDisplay).
 *
 * This hook handles:
 * - Restoring line indices from time when transcript loads
 * - Debug logging for echo mode state changes
 */
export function useEchoRegionManager() {
  const { lines } = useTranscriptDisplay()
  const linesRef = useRef<TranscriptLineState[]>([])

  // Update lines ref
  useEffect(() => {
    linesRef.current = lines
  }, [lines])

  // Echo mode state
  const echoModeActive = usePlayerStore((state) => state.echoModeActive)
  const echoStartLineIndex = usePlayerStore((state) => state.echoStartLineIndex)
  const echoEndLineIndex = usePlayerStore((state) => state.echoEndLineIndex)
  const echoStartTime = usePlayerStore((state) => state.echoStartTime)
  const echoEndTime = usePlayerStore((state) => state.echoEndTime)
  const updateEchoRegion = usePlayerStore((state) => state.updateEchoRegion)

  // Track if we've already restored to prevent multiple restorations
  const hasRestoredRef = useRef(false)

  // Reset restoration flag when echo mode changes
  useEffect(() => {
    if (!echoModeActive) {
      hasRestoredRef.current = false
    }
  }, [echoModeActive])

  // Restore echo region line indices from time when transcript lines are available
  // This handles the case when echo mode is restored from EchoSession but line indices are not set
  useEffect(() => {
    // Skip if already restored or conditions not met
    if (hasRestoredRef.current) return

    const currentLines = linesRef.current
    if (
      echoModeActive &&
      echoStartTime >= 0 &&
      echoEndTime >= 0 &&
      currentLines.length > 0 &&
      (echoStartLineIndex < 0 || echoEndLineIndex < 0)
    ) {
      log.debug('Restoring echo region line indices from time', {
        echoStartTime,
        echoEndTime,
        currentLineCount: currentLines.length,
      })

      // Find line indices based on time
      const startIndex = findLineIndexByTime(currentLines, echoStartTime)
      const endIndex = findLineIndexByTime(currentLines, echoEndTime)

      // Ensure endIndex >= startIndex
      const finalEndIndex = Math.max(startIndex, endIndex)

      if (startIndex >= 0 && finalEndIndex >= 0) {
        const startLine = currentLines[startIndex]
        const endLine = currentLines[finalEndIndex]

        if (startLine && endLine) {
          log.debug('Updating echo region with calculated line indices', {
            startIndex,
            endIndex: finalEndIndex,
            startTime: startLine.startTimeSeconds,
            endTime: endLine.endTimeSeconds,
          })

          // Mark as restored before updating to prevent re-triggering
          hasRestoredRef.current = true

          // Update with calculated line indices and actual line times
          updateEchoRegion(
            startIndex,
            finalEndIndex,
            startLine.startTimeSeconds,
            endLine.endTimeSeconds
          )
        }
      }
    }
  }, [
    echoModeActive,
    echoStartTime,
    echoEndTime,
    echoStartLineIndex,
    echoEndLineIndex,
    lines.length,
    updateEchoRegion,
  ])
}

