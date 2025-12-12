/**
 * Echo mode playback constraints
 *
 * Goal: keep playback strictly inside a configured [start, end] time window,
 * while being tolerant to floating-point precision, imperfect timestamps, and
 * media element seek/timeupdate granularity.
 */

export type EchoWindow = {
  /** Inclusive start time (seconds) */
  start: number
  /** Exclusive-ish end time (seconds). Playback must stay < end (with epsilon). */
  end: number
}

export type NormalizeEchoWindowInput = {
  active: boolean
  startTimeSeconds: number
  endTimeSeconds: number
  /**
   * Media duration in seconds. If unknown/invalid, we won't clamp to it.
   * (E.g. some streams can report NaN).
   */
  durationSeconds?: number
}

export type EchoPlaybackDecision =
  | { kind: 'ok' }
  | { kind: 'clamp'; timeSeconds: number }
  | { kind: 'loop'; timeSeconds: number }

const DEFAULT_ECHO_SEEK_EPSILON_SECONDS = 0.02 // 20ms
const DEFAULT_ECHO_END_GUARD_SECONDS = 0.04 // 40ms (avoid hitting end/ended)
const DEFAULT_ECHO_START_GUARD_SECONDS = 0.02 // 20ms

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

/**
 * Normalize and validate the echo window.
 *
 * - Ensures finite numbers
 * - Clamps to [0, duration] when duration is valid
 * - Ensures end > start
 */
export function normalizeEchoWindow({
  active,
  startTimeSeconds,
  endTimeSeconds,
  durationSeconds,
}: NormalizeEchoWindowInput): EchoWindow | null {
  if (!active) return null
  if (!isFiniteNumber(startTimeSeconds) || !isFiniteNumber(endTimeSeconds)) return null

  const hasValidDuration = isFiniteNumber(durationSeconds) && durationSeconds > 0
  const maxTime = hasValidDuration ? durationSeconds : Number.POSITIVE_INFINITY

  const start = clamp(startTimeSeconds, 0, maxTime)
  const end = clamp(endTimeSeconds, 0, maxTime)

  if (!Number.isFinite(start) || !Number.isFinite(end)) return null
  if (end <= start) return null

  return { start, end }
}

/**
 * Clamp a requested seek time into the echo window.
 *
 * Notes:
 * - We prefer to keep time strictly < end to avoid immediately triggering loop/ended.
 */
export function clampSeekTimeToEchoWindow(
  requestedTimeSeconds: number,
  window: EchoWindow,
  opts?: { seekEpsilonSeconds?: number }
): number {
  const seekEpsilonSeconds = opts?.seekEpsilonSeconds ?? DEFAULT_ECHO_SEEK_EPSILON_SECONDS

  if (!isFiniteNumber(requestedTimeSeconds)) return window.start

  const maxPlayable = Math.max(window.start, window.end - seekEpsilonSeconds)
  return clamp(requestedTimeSeconds, window.start, maxPlayable)
}

/**
 * Decide what to do with a playback time update.
 *
 * - If time is before start (with guard): clamp to start
 * - If time is at/after end (with guard): loop to start
 */
export function decideEchoPlaybackTime(
  currentTimeSeconds: number,
  window: EchoWindow,
  opts?: {
    startGuardSeconds?: number
    endGuardSeconds?: number
  }
): EchoPlaybackDecision {
  const startGuardSeconds = opts?.startGuardSeconds ?? DEFAULT_ECHO_START_GUARD_SECONDS
  const endGuardSeconds = opts?.endGuardSeconds ?? DEFAULT_ECHO_END_GUARD_SECONDS

  if (!isFiniteNumber(currentTimeSeconds)) {
    return { kind: 'clamp', timeSeconds: window.start }
  }

  if (currentTimeSeconds < window.start - startGuardSeconds) {
    return { kind: 'clamp', timeSeconds: window.start }
  }

  if (currentTimeSeconds >= window.end - endGuardSeconds) {
    return { kind: 'loop', timeSeconds: window.start }
  }

  return { kind: 'ok' }
}


