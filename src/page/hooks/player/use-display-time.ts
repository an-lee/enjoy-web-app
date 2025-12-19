/**
 * useDisplayTime - Hook for subscribing to player display time changes
 *
 * Uses external store pattern to avoid unnecessary re-renders of components that
 * don't need real-time time updates.
 *
 * Design rationale:
 * - Display time updates very frequently (4-10 times per second via timeupdate events)
 * - Player store's updateProgress is throttled to every 2 seconds (for persistence)
 * - If displayTime were in player store, it would cause frequent re-renders of
 *   PlayerContainer and all components using usePlayerStore, even with selectors
 * - This separate store ensures only components that need displayTime re-render
 *
 * This is a performance optimization that follows React best practices for
 * high-frequency updates.
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
 * Set the display time (called from media element event handlers)
 *
 * @param time - Current playback time in seconds
 * @internal - This is exported for use by media element handlers only
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
  // Third parameter (getServerSnapshot) is same as getSnapshot for client-only usage
  return useSyncExternalStore(subscribeToTime, getDisplayTime, getDisplayTime)
}

