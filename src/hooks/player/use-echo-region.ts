/**
 * useEchoRegion Hook
 *
 * Manages echo region state and operations (expand, shrink, etc.)
 *
 * IMPORTANT: This hook is designed to be called from multiple components.
 * All state comes from the central store to ensure consistency.
 */

import { useCallback, useEffect } from 'react'
import { usePlayerStore } from '@/stores/player'
import type { TranscriptLineState } from '../../components/player/transcript/types'

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Find line index by time using binary search
 */
export function findLineIndexByTime(
  lines: TranscriptLineState[],
  timeSeconds: number
): number {
  if (lines.length === 0) return -1

  let left = 0
  let right = lines.length - 1
  let result = -1

  while (left <= right) {
    const mid = Math.floor((left + right) / 2)
    const line = lines[mid]

    if (
      timeSeconds >= line.startTimeSeconds &&
      timeSeconds < line.endTimeSeconds
    ) {
      return mid
    }

    if (timeSeconds < line.startTimeSeconds) {
      right = mid - 1
    } else {
      result = mid
      left = mid + 1
    }
  }

  if (result < 0) return 0
  if (result >= lines.length - 1) return lines.length - 1

  const line1 = lines[result]
  const line2 = lines[result + 1]
  const diff1 = Math.abs(timeSeconds - line1.endTimeSeconds)
  const diff2 = Math.abs(timeSeconds - line2.startTimeSeconds)
  return diff1 < diff2 ? result : result + 1
}

// ============================================================================
// Main Hook - Pure State Access
// ============================================================================

/**
 * Hook for accessing echo region state.
 * Can be safely called from multiple components - all state is centralized in the store.
 */
export function useEchoRegion() {
  const echoModeActive = usePlayerStore((s) => s.echoModeActive)
  const echoStartLineIndex = usePlayerStore((s) => s.echoStartLineIndex)
  const echoEndLineIndex = usePlayerStore((s) => s.echoEndLineIndex)
  const echoStartTime = usePlayerStore((s) => s.echoStartTime)
  const echoEndTime = usePlayerStore((s) => s.echoEndTime)
  const updateEchoRegion = usePlayerStore((s) => s.updateEchoRegion)

  return {
    echoModeActive,
    echoStartLineIndex,
    echoEndLineIndex,
    echoStartTime,
    echoEndTime,
    updateEchoRegion,
  }
}

// ============================================================================
// Operations Hook - Expand/Shrink Logic
// ============================================================================

type AdjustAction = 'expand' | 'shrink'
type AdjustDirection = 'forward' | 'backward'

/**
 * Hook for echo region operations (expand/shrink).
 * Only needed in components that modify the echo region.
 *
 * @param lines - Transcript lines required for boundary calculations
 */
export function useEchoRegionOperations(lines: TranscriptLineState[]) {
  const { echoStartLineIndex, echoEndLineIndex, updateEchoRegion } =
    useEchoRegion()

  /**
   * Unified handler for adjusting echo region boundaries
   */
  const adjustRegion = useCallback(
    (action: AdjustAction, direction: AdjustDirection) => {
      if (
        lines.length === 0 ||
        echoStartLineIndex < 0 ||
        echoEndLineIndex < 0
      ) {
        return
      }

      let newStartIdx = echoStartLineIndex
      let newEndIdx = echoEndLineIndex

      if (action === 'expand') {
        if (direction === 'forward' && echoEndLineIndex < lines.length - 1) {
          newEndIdx = echoEndLineIndex + 1
        } else if (direction === 'backward' && echoStartLineIndex > 0) {
          newStartIdx = echoStartLineIndex - 1
        }
      } else {
        // shrink
        if (direction === 'forward' && echoEndLineIndex > echoStartLineIndex) {
          newEndIdx = echoEndLineIndex - 1
        } else if (
          direction === 'backward' &&
          echoStartLineIndex < echoEndLineIndex
        ) {
          newStartIdx = echoStartLineIndex + 1
        }
      }

      // Only update if indices actually changed
      if (
        newStartIdx !== echoStartLineIndex ||
        newEndIdx !== echoEndLineIndex
      ) {
        const startLine = lines[newStartIdx]
        const endLine = lines[newEndIdx]
        if (startLine && endLine) {
          updateEchoRegion(
            newStartIdx,
            newEndIdx,
            startLine.startTimeSeconds,
            endLine.endTimeSeconds
          )
        }
      }
    },
    [lines, echoStartLineIndex, echoEndLineIndex, updateEchoRegion]
  )

  // Convenience handlers for backward compatibility
  const handleExpandEchoForward = useCallback(
    () => adjustRegion('expand', 'forward'),
    [adjustRegion]
  )
  const handleExpandEchoBackward = useCallback(
    () => adjustRegion('expand', 'backward'),
    [adjustRegion]
  )
  const handleShrinkEchoForward = useCallback(
    () => adjustRegion('shrink', 'forward'),
    [adjustRegion]
  )
  const handleShrinkEchoBackward = useCallback(
    () => adjustRegion('shrink', 'backward'),
    [adjustRegion]
  )

  return {
    adjustRegion,
    handleExpandEchoForward,
    handleExpandEchoBackward,
    handleShrinkEchoForward,
    handleShrinkEchoBackward,
  }
}

// ============================================================================
// Manager Hook - Side Effects
// ============================================================================

import { createLogger } from '@/lib/utils'
import { useTranscriptDisplay } from './use-transcript-display'

const log = createLogger({ name: 'useEchoRegionManager' })

/**
 * Hook for managing echo region side effects.
 * Should only be called ONCE in the component tree (typically in TranscriptDisplay).
 *
 * Handles restoring line indices from time when transcript loads.
 */
export function useEchoRegionManager() {
  const { lines } = useTranscriptDisplay()
  const {
    echoModeActive,
    echoStartLineIndex,
    echoEndLineIndex,
    echoStartTime,
    echoEndTime,
    updateEchoRegion,
  } = useEchoRegion()

  // Restore echo region line indices from time when transcript lines are available
  useEffect(() => {
    // Skip if indices are already set or conditions not met
    const needsRestoration =
      echoModeActive &&
      echoStartTime >= 0 &&
      echoEndTime >= 0 &&
      lines.length > 0 &&
      (echoStartLineIndex < 0 || echoEndLineIndex < 0)

    if (!needsRestoration) return

    log.debug('Restoring echo region line indices from time', {
      echoStartTime,
      echoEndTime,
      lineCount: lines.length,
    })

    const startIndex = findLineIndexByTime(lines, echoStartTime)
    const endIndex = Math.max(
      startIndex,
      findLineIndexByTime(lines, echoEndTime)
    )

    if (startIndex >= 0 && endIndex >= 0) {
      const startLine = lines[startIndex]
      const endLine = lines[endIndex]

      if (startLine && endLine) {
        log.debug('Updating echo region with calculated line indices', {
          startIndex,
          endIndex,
        })

        updateEchoRegion(
          startIndex,
          endIndex,
          startLine.startTimeSeconds,
          endLine.endTimeSeconds
        )
      }
    }
  }, [
    echoModeActive,
    echoStartTime,
    echoEndTime,
    echoStartLineIndex,
    echoEndLineIndex,
    lines,
    updateEchoRegion,
  ])
}
