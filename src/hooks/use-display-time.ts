/**
 * useDisplayTime - Hook for subscribing to player display time changes
 *
 * Uses external store pattern to avoid unnecessary re-renders of PlayerContainer.
 * The display time is updated frequently (on timeupdate events) but we don't want
 * to trigger re-renders of the entire PlayerContainer component.
 */

import { useSyncExternalStore } from 'react'

// ============================================================================
// Time Display Store (separate from main store to avoid re-renders)
// ============================================================================

let currentDisplayTime = 0
const timeListeners = new Set<() => void>()

function subscribeToTime(callback: () => void) {
  timeListeners.add(callback)
  return () => timeListeners.delete(callback)
}

function getDisplayTime() {
  return currentDisplayTime
}

/**
 * Set the display time (called from PlayerContainer)
 * @internal - This is exported for use by PlayerContainer only
 */
export function setDisplayTime(time: number) {
  currentDisplayTime = time
  timeListeners.forEach((listener) => listener())
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to subscribe to display time changes
 *
 * @returns Current display time in seconds
 *
 * @example
 * ```tsx
 * function PlayerControls() {
 *   const displayTime = useDisplayTime()
 *   return <div>Current time: {formatTime(displayTime)}</div>
 * }
 * ```
 */
export function useDisplayTime() {
  return useSyncExternalStore(subscribeToTime, getDisplayTime, getDisplayTime)
}

