import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ============================================================================
// Debug Logger
// ============================================================================

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LoggerOptions {
  /** Module/component name for log prefix */
  name: string
  /** Whether to enable logging (defaults to checking import.meta.env.DEV) */
  enabled?: boolean
}

interface Logger {
  debug: (...args: unknown[]) => void
  info: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
}

const LOG_STYLES: Record<LogLevel, string> = {
  debug: 'color: #6b7280;',
  info: 'color: #3b82f6;',
  warn: 'color: #f59e0b;',
  error: 'color: #ef4444;',
}

/**
 * Creates a namespaced logger for debugging
 *
 * @example
 * const log = createLogger({ name: 'Player' })
 * log.debug('Loading media', { id: '123' })
 * // Output: [Player] Loading media { id: '123' }
 */
export function createLogger(options: LoggerOptions): Logger {
  const { name, enabled } = options

  // Check if logging should be enabled
  // In production, only enable if explicitly set to true
  const isEnabled = enabled ?? (typeof import.meta !== 'undefined' && import.meta.env?.DEV)

  const createLogFn = (level: LogLevel) => {
    return (...args: unknown[]) => {
      if (!isEnabled) return

      const prefix = `[${name}]`
      const style = LOG_STYLES[level]

      // Construct format string and arguments array for %c styling
      // %c applies CSS styles to the text that follows it in the format string
      // We use two %c: one to apply color to prefix, one to reset for remaining content
      const formatStr = '%c' + prefix + '%c'
      const logArgs: unknown[] = [formatStr, style, '']

      // Add remaining arguments after style reset
      if (args.length > 0) {
        logArgs.push(...args)
      }

      // Use appropriate console method for each log level
      // %c formatting works with all console methods (log, info, warn, error)
      switch (level) {
        case 'debug':
          console.log.apply(console, logArgs as Parameters<typeof console.log>)
          break
        case 'info':
          console.info.apply(console, logArgs as Parameters<typeof console.info>)
          break
        case 'warn':
          console.warn.apply(console, logArgs as Parameters<typeof console.warn>)
          break
        case 'error':
          console.error.apply(console, logArgs as Parameters<typeof console.error>)
          break
      }
    }
  }

  return {
    debug: createLogFn('debug'),
    info: createLogFn('info'),
    warn: createLogFn('warn'),
    error: createLogFn('error'),
  }
}

// ============================================================================
// Time Formatting
// ============================================================================

/**
 * Formats seconds into a human-readable time string
 *
 * @example
 * formatTime(65) // "1:05"
 * formatTime(3665) // "1:01:05"
 */
export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Formats a relative time from an ISO string
 *
 * @example
 * formatRelativeTime('2024-01-01T12:00:00Z') // "2h ago"
 */
export function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}
