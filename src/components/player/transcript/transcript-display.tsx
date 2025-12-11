/**
 * TranscriptDisplay - Lyrics-style transcript display component
 *
 * Features:
 * - Primary and secondary (translation) transcript support
 * - Time-based highlighting of current line
 * - Auto-scroll to active line when playing
 * - Click to seek functionality
 * - Smooth transitions and elegant styling
 */

import { useRef, useEffect, useCallback, memo, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
import { Link } from '@tanstack/react-router'
import { cn, formatTime, createLogger } from '@/lib/utils'
import { usePlayerStore } from '@/stores/player'
import { getAIServiceConfig } from '@/ai/core/config'
import { AIProvider } from '@/ai/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Progress } from '@/components/ui/progress'
import { useDisplayTime } from '@/hooks/use-display-time'
import { useTranscriptDisplay } from './use-transcript-display'
import { useRetranscribe } from '@/hooks/use-retranscribe'
import type {
  TranscriptDisplayProps,
  TranscriptLineState,
  TranscriptDisplayConfig,
} from './types'

// ============================================================================
// Constants
// ============================================================================

const SCROLL_OFFSET = 120 // px offset from top when scrolling

// Logger for debugging
const log = createLogger({ name: 'TranscriptDisplay' })

// Language display names (could be moved to a shared constant)
const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  zh: '中文',
  ja: '日本語',
  ko: '한국어',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  pt: 'Português',
  ru: 'Русский',
  it: 'Italiano',
}

// ============================================================================
// Sub-components
// ============================================================================

// Shadow Reading Panel Component
interface ShadowReadingPanelProps {
  startTime: number
  endTime: number
  onRecord: () => void
  isRecording: boolean
}

function ShadowReadingPanel({
  startTime,
  endTime,
  onRecord,
  isRecording,
}: ShadowReadingPanelProps) {
  const { t } = useTranslation()
  const duration = endTime - startTime

  return (
    <div className="shrink-0 bg-orange-950/30 border-t border-orange-800/50 shadow-lg">
      {/* Header row */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-orange-800/30">
        <div className="flex items-center gap-2">
          <Icon icon="lucide:mic" className="w-5 h-5 text-orange-500" />
          <h3 className="text-base font-semibold text-foreground">
            {t('player.transcript.shadowReading')}
          </h3>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Icon icon="lucide:clock" className="w-4 h-4" />
          <span className="tabular-nums font-medium">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Content area */}
      <div className="px-6 py-4">
        <p className="text-sm text-muted-foreground mb-5">
          {t('player.transcript.shadowReadingHint')}
        </p>

        {/* Controls row */}
        <div className="flex items-center justify-center gap-4">
          {/* Pitch contour button */}
          <button
            type="button"
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-orange-900/20 rounded-lg transition-colors"
          >
            <Icon icon="lucide:activity" className="w-4 h-4" />
            <span>{t('player.transcript.showPitchContour')}</span>
          </button>

          {/* Record button - prominent orange */}
          <button
            type="button"
            onClick={onRecord}
            className={cn(
              'flex items-center justify-center gap-2 px-8 py-3 rounded-lg font-medium transition-all',
              'shadow-md hover:shadow-lg',
              isRecording
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : 'bg-orange-500 text-white hover:bg-orange-600'
            )}
          >
            <Icon
              icon={isRecording ? 'lucide:square' : 'lucide:mic'}
              className="w-5 h-5"
            />
            <span>
              {isRecording
                ? t('player.transcript.stopRecording')
                : t('player.transcript.record')}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}

interface TranscriptLineItemProps {
  line: TranscriptLineState
  showSecondary: boolean
  onClick: () => void
  isInEchoRegion: boolean
}

const TranscriptLineItem = memo(function TranscriptLineItem({
  line,
  showSecondary,
  onClick,
  isInEchoRegion,
}: TranscriptLineItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group w-full text-left px-6 py-4 transition-all duration-300',
        'hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        // Echo region - prominent orange/amber background (matching reference)
        isInEchoRegion && [
          'bg-orange-600/90 text-white rounded-lg',
          'hover:bg-orange-600',
          'shadow-md',
        ],
        // Non-echo region styles
        !isInEchoRegion && [
          'rounded-xl',
          // Active state - highlighted with scale and glow
          line.isActive && [
            'bg-primary/10 scale-[1.02]',
            'shadow-[0_0_30px_rgba(var(--primary),0.12)]',
          ],
          // Past state - dimmed
          line.isPast && !line.isActive && 'opacity-50',
          // Future state - slightly dimmed
          !line.isPast && !line.isActive && 'opacity-70 hover:opacity-100',
        ]
      )}
    >
      {/* Primary text */}
      <p
        className={cn(
          'text-lg md:text-xl leading-relaxed transition-all duration-300',
          isInEchoRegion && 'text-white font-medium',
          !isInEchoRegion && line.isActive && 'text-primary font-medium text-xl md:text-2xl',
          !isInEchoRegion && !line.isActive && 'text-foreground'
        )}
      >
        {line.primary.text}
      </p>

      {/* Secondary text (translation) */}
      {showSecondary && line.secondary && (
        <p
          className={cn(
            'mt-2 text-base leading-relaxed transition-all duration-300',
            isInEchoRegion && 'text-white/80',
            !isInEchoRegion && line.isActive && 'text-primary/70',
            !isInEchoRegion && !line.isActive && 'text-muted-foreground'
          )}
        >
          {line.secondary.text}
        </p>
      )}
    </button>
  )
})

interface LanguageSelectorProps {
  label: string
  value: string | null
  options: Array<{ value: string; label: string }>
  onChange: (value: string) => void
  placeholder: string
  allowNone?: boolean
  onClear?: () => void
}

function LanguageSelector({
  label,
  value,
  options,
  onChange,
  placeholder,
  allowNone,
  onClear,
}: LanguageSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {label}:
      </span>
      <Select value={value ?? ''} onValueChange={onChange}>
        <SelectTrigger className="h-7 w-[100px] text-xs">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {allowNone && (
            <SelectItem value="none" className="text-xs">
              None
            </SelectItem>
          )}
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value} className="text-xs">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {allowNone && value && onClear && (
        <button
          type="button"
          onClick={onClear}
          className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
        >
          <Icon icon="lucide:x" className="w-3 h-3" />
        </button>
      )}
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function TranscriptDisplay({
  className,
  currentTime: _currentTimeProp, // Use useDisplayTime instead for real-time updates
  isPlaying,
  onLineClick,
  config: configOverrides,
}: TranscriptDisplayProps) {
  const renderCountRef = useRef(0)
  renderCountRef.current++
  log.debug('TranscriptDisplay render', {
    renderCount: renderCountRef.current,
    isPlaying,
    currentTime: _currentTimeProp,
  })

  const { t } = useTranslation()
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const activeLineRef = useRef<HTMLDivElement>(null)
  const lastScrolledIndexRef = useRef<number>(-1)
  const currentSession = usePlayerStore((state) => state.currentSession)

  // Get real-time display time from the external store
  const currentTime = useDisplayTime()

  // Merge config with defaults - memoized to prevent unnecessary re-renders
  const config: TranscriptDisplayConfig = useMemo(() => {
    log.debug('Config recalculated', { configOverrides })
    return {
      autoScroll: true,
      scrollBehavior: 'smooth',
      scrollPosition: 'center',
      showSecondary: true,
      highlightMode: 'line',
      ...configOverrides,
    }
  }, [configOverrides])

  // Get transcript state
  const {
    lines,
    activeLineIndex,
    transcripts,
    availableTranscripts,
    setPrimaryLanguage,
    setSecondaryLanguage,
    primaryLanguage,
    secondaryLanguage,
  } = useTranscriptDisplay(currentTime)

  const linesRef = useRef<TranscriptLineState[]>([])

  // Update lines ref
  useEffect(() => {
    log.debug('Lines updated', { count: lines.length })
    linesRef.current = lines
  }, [lines])

  // Echo mode state - use separate selectors to prevent object recreation issues
  // This prevents infinite loops caused by object reference changes
  const echoModeActive = usePlayerStore((state) => state.echoModeActive)
  const echoStartLineIndex = usePlayerStore((state) => state.echoStartLineIndex)
  const echoEndLineIndex = usePlayerStore((state) => state.echoEndLineIndex)
  const echoStartTime = usePlayerStore((state) => state.echoStartTime)
  const echoEndTime = usePlayerStore((state) => state.echoEndTime)
  const activateEchoMode = usePlayerStore((state) => state.activateEchoMode)
  const deactivateEchoMode = usePlayerStore((state) => state.deactivateEchoMode)
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

  // Handle echo mode activation
  const handleActivateEchoMode = useCallback(() => {
    log.debug('Activating echo mode', { activeLineIndex })
    const currentLines = linesRef.current
    if (activeLineIndex >= 0 && activeLineIndex < currentLines.length) {
      const line = currentLines[activeLineIndex]
      log.debug('Echo mode activation', {
        lineIndex: activeLineIndex,
        startTime: line.startTimeSeconds,
        endTime: line.endTimeSeconds,
      })
      activateEchoMode(
        activeLineIndex,
        activeLineIndex,
        line.startTimeSeconds,
        line.endTimeSeconds
      )
    } else {
      log.warn('Cannot activate echo mode: invalid activeLineIndex', {
        activeLineIndex,
        linesCount: currentLines.length,
      })
    }
  }, [activeLineIndex, activateEchoMode])

  // Handle echo mode deactivation
  const handleDeactivateEchoMode = useCallback(() => {
    log.debug('Deactivating echo mode')
    deactivateEchoMode()
  }, [deactivateEchoMode])

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

  // Placeholder for recording (not implemented yet)
  const [isRecording, setIsRecording] = useState(false)
  const handleRecord = useCallback(() => {
    // TODO: Implement recording
    setIsRecording((prev) => !prev)
  }, [])

  // Retranscribe functionality
  const { retranscribe, isTranscribing, progress, progressPercent } = useRetranscribe()
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  // Get current ASR provider info
  const asrConfig = getAIServiceConfig('asr')
  const providerName =
    asrConfig.provider === AIProvider.ENJOY
      ? t('player.transcript.provider.enjoy')
      : asrConfig.provider === AIProvider.LOCAL
        ? t('player.transcript.provider.local')
        : t('player.transcript.provider.byok')

  // Get media duration for limitations
  const mediaDuration = currentSession?.duration || 0
  const durationMinutes = Math.ceil(mediaDuration / 60)

  // Handle retranscribe with confirmation
  const handleRetranscribeClick = useCallback(() => {
    setShowConfirmDialog(true)
  }, [])

  const handleConfirmRetranscribe = useCallback(() => {
    setShowConfirmDialog(false)
    retranscribe(primaryLanguage || undefined)
  }, [retranscribe, primaryLanguage])

  // Build language options - memoized to prevent unnecessary re-renders
  const languageOptions = useMemo(
    () =>
      availableTranscripts.map((t) => ({
        value: t.language,
        label: LANGUAGE_NAMES[t.language] || t.language.toUpperCase(),
      })),
    [availableTranscripts]
  )

  // Secondary language options - filtered to exclude primary
  const secondaryLanguageOptions = useMemo(
    () => languageOptions.filter((o) => o.value !== primaryLanguage),
    [languageOptions, primaryLanguage]
  )

  // Handle line click
  const handleLineClick = useCallback(
    (startTimeSeconds: number) => {
      onLineClick?.(startTimeSeconds)
    },
    [onLineClick]
  )

  // Auto-scroll to active line when playing
  useEffect(() => {
    if (
      !config.autoScroll ||
      !isPlaying ||
      activeLineIndex < 0 ||
      activeLineIndex === lastScrolledIndexRef.current
    ) {
      return
    }

    lastScrolledIndexRef.current = activeLineIndex

    // Find the active line element
    const scrollArea = scrollAreaRef.current
    if (!scrollArea) return

    const lineElements = scrollArea.querySelectorAll('[data-line-index]')
    const activeLine = lineElements[activeLineIndex] as HTMLElement | undefined

    if (!activeLine) return

    // Calculate scroll position
    const scrollContainer = scrollArea.querySelector(
      '[data-radix-scroll-area-viewport]'
    ) as HTMLElement | null
    if (!scrollContainer) return

    const lineRect = activeLine.getBoundingClientRect()

    let targetScrollTop: number

    if (config.scrollPosition === 'center') {
      // Center the active line
      targetScrollTop =
        activeLine.offsetTop -
        scrollContainer.clientHeight / 2 +
        lineRect.height / 2
    } else {
      // Position at top with offset
      targetScrollTop = activeLine.offsetTop - SCROLL_OFFSET
    }

    scrollContainer.scrollTo({
      top: Math.max(0, targetScrollTop),
      behavior: config.scrollBehavior,
    })
  }, [activeLineIndex, isPlaying, config.autoScroll, config.scrollBehavior, config.scrollPosition])

  // Handle secondary language change
  const handleSecondaryChange = useCallback(
    (value: string) => {
      if (value === 'none') {
        setSecondaryLanguage(null)
      } else {
        setSecondaryLanguage(value)
      }
    },
    [setSecondaryLanguage]
  )

  // Handle clear secondary language
  const handleClearSecondaryLanguage = useCallback(() => {
    setSecondaryLanguage(null)
  }, [setSecondaryLanguage])

  // Loading state
  if (transcripts.isLoading) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center h-full',
          className
        )}
      >
        <Icon
          icon="lucide:loader-2"
          className="w-8 h-8 animate-spin text-muted-foreground"
        />
        <p className="mt-3 text-sm text-muted-foreground">
          {t('common.loading')}
        </p>
      </div>
    )
  }

  // Error state
  if (transcripts.error) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center h-full text-center px-4',
          className
        )}
      >
        <Icon
          icon="lucide:alert-circle"
          className="w-8 h-8 text-destructive mb-3"
        />
        <p className="text-sm text-destructive">{transcripts.error}</p>
      </div>
    )
  }

  // Empty state - no transcripts available
  if (availableTranscripts.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center h-full text-center px-4',
          className
        )}
      >
        <Icon
          icon="lucide:subtitles"
          className="w-12 h-12 text-muted-foreground/40 mb-3"
        />
        <p className="text-sm text-muted-foreground">
          {t('player.transcript.noTranscript')}
        </p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          {t('player.transcript.noTranscriptHint')}
        </p>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header with retranscribe button */}
      <div className="shrink-0 flex items-center justify-between gap-4 px-4 py-3 border-b bg-background/80 backdrop-blur-sm">
        {/* Language selectors */}
        <div className="flex items-center justify-center gap-6 flex-1">
          <LanguageSelector
            label={t('player.transcript.primary')}
            value={primaryLanguage}
            options={languageOptions}
            onChange={setPrimaryLanguage}
            placeholder={t('player.transcript.selectLanguage')}
          />
          <LanguageSelector
            label={t('player.transcript.secondary')}
            value={secondaryLanguage}
            options={secondaryLanguageOptions}
            onChange={handleSecondaryChange}
            placeholder={t('player.transcript.selectLanguage')}
            allowNone
            onClear={handleClearSecondaryLanguage}
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Echo mode toggle */}
          {echoModeActive ? (
            <button
              type="button"
              onClick={handleDeactivateEchoMode}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                'bg-orange-500 text-white hover:bg-orange-600',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              )}
              title={t('player.transcript.deactivateEchoMode')}
            >
              <Icon icon="lucide:x" className="w-3 h-3" />
              <span>{t('player.transcript.exitEchoMode')}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleActivateEchoMode}
              disabled={activeLineIndex < 0 || !currentSession}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                'bg-secondary text-secondary-foreground hover:bg-secondary/80',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              )}
              title={t('player.transcript.activateEchoMode')}
            >
              <Icon icon="lucide:mic" className="w-3 h-3" />
              <span>{t('player.transcript.echoMode')}</span>
            </button>
          )}

          {/* Retranscribe button */}
          <button
            type="button"
            onClick={handleRetranscribeClick}
            disabled={isTranscribing || !currentSession}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
              'bg-primary text-primary-foreground hover:bg-primary/90',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            )}
            title={t('player.transcript.retranscribe')}
          >
            {isTranscribing ? (
              <>
                <Icon icon="lucide:loader-2" className="w-3 h-3 animate-spin" />
                <span>{progress || t('player.transcript.retranscribing')}</span>
              </>
            ) : (
              <>
                <Icon icon="lucide:refresh-cw" className="w-3 h-3" />
                <span>{t('player.transcript.retranscribe')}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Progress indicator for local model */}
      {isTranscribing && asrConfig.provider === AIProvider.LOCAL && progressPercent !== null && (
        <div className="shrink-0 px-4 py-2 border-b bg-background/50">
          <div className="flex items-center gap-2 mb-1">
            <Icon icon="lucide:activity" className="w-3 h-3 text-primary" />
            <span className="text-xs text-muted-foreground">{progress}</span>
            {progressPercent !== null && (
              <span className="text-xs text-muted-foreground ml-auto">{progressPercent}%</span>
            )}
          </div>
          <Progress value={progressPercent} className="h-1" />
        </div>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('player.transcript.confirmRetranscribe.title')}</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <div>
                <p className="font-medium mb-1">{t('player.transcript.confirmRetranscribe.currentProvider')}</p>
                <p className="text-sm">{providerName}</p>
                <Link
                  to="/settings"
                  search={{ tab: 'ai' }}
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1"
                  onClick={() => setShowConfirmDialog(false)}
                >
                  {t('player.transcript.confirmRetranscribe.changeSettings')}
                  <Icon icon="lucide:external-link" className="w-3 h-3" />
                </Link>
              </div>

              <div>
                <p className="font-medium mb-1">{t('player.transcript.confirmRetranscribe.limitations')}</p>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  {asrConfig.provider === AIProvider.LOCAL && (
                    <li>{t('player.transcript.confirmRetranscribe.limitation.local')}</li>
                  )}
                  {asrConfig.provider === AIProvider.ENJOY && (
                    <li>{t('player.transcript.confirmRetranscribe.limitation.enjoy')}</li>
                  )}
                  {durationMinutes > 30 && (
                    <li>{t('player.transcript.confirmRetranscribe.limitation.longDuration', { minutes: durationMinutes })}</li>
                  )}
                </ul>
              </div>

              {asrConfig.provider === AIProvider.LOCAL && (
                <div className="bg-muted p-2 rounded text-xs">
                  <p>{t('player.transcript.confirmRetranscribe.localNote')}</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRetranscribe}>
              {t('player.transcript.confirmRetranscribe.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Transcript lines */}
      <ScrollArea ref={scrollAreaRef} className="flex-1">
        <div className="py-8 px-4 space-y-2">
          {lines.map((line) => {
            const isInEchoRegion =
              echoModeActive &&
              line.index >= echoStartLineIndex &&
              line.index <= echoEndLineIndex
            const isEchoStart = echoModeActive && line.index === echoStartLineIndex
            const isEchoEnd = echoModeActive && line.index === echoEndLineIndex

            return (
              <div
                key={line.index}
                ref={(el) => {
                  // Only set ref if this is the active line to prevent ref callback loops
                  if (line.isActive && el) {
                    activeLineRef.current = el
                  } else if (!line.isActive && activeLineRef.current === el) {
                    // Clear ref if it's no longer active
                    activeLineRef.current = null
                  }
                }}
                data-line-index={line.index}
                className="relative"
              >
                {/* Echo region top controls - shown above the first line of echo region */}
                {isEchoStart && echoModeActive && (
                  <div className="flex items-center justify-center gap-2 py-2 mb-1">
                    <div className="h-px bg-border flex-1 max-w-[60px]" />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleExpandEchoBackward}
                        disabled={echoStartLineIndex === 0}
                        className={cn(
                          'p-1.5 rounded-full hover:bg-accent transition-colors text-muted-foreground hover:text-foreground',
                          'disabled:opacity-30 disabled:cursor-not-allowed'
                        )}
                        title={t('player.transcript.expandEchoBackward')}
                      >
                        <Icon icon="lucide:chevron-up" className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleShrinkEchoBackward}
                        disabled={echoStartLineIndex >= echoEndLineIndex}
                        className={cn(
                          'p-1.5 rounded-full hover:bg-accent transition-colors text-muted-foreground hover:text-foreground',
                          'disabled:opacity-30 disabled:cursor-not-allowed'
                        )}
                        title={t('player.transcript.shrinkEchoBackward')}
                      >
                        <Icon icon="lucide:minus" className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="h-px bg-border flex-1 max-w-[60px]" />
                  </div>
                )}

                <TranscriptLineItem
                  line={line}
                  showSecondary={config.showSecondary && !!secondaryLanguage}
                  onClick={() => handleLineClick(line.startTimeSeconds)}
                  isInEchoRegion={isInEchoRegion}
                />

                {/* Echo region bottom controls - shown below the last line of echo region */}
                {isEchoEnd && echoModeActive && (
                  <div className="flex items-center justify-center gap-2 py-2 mt-1">
                    <div className="h-px bg-border flex-1 max-w-[60px]" />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleShrinkEchoForward}
                        disabled={echoEndLineIndex <= echoStartLineIndex}
                        className={cn(
                          'p-1.5 rounded-full hover:bg-accent transition-colors text-muted-foreground hover:text-foreground',
                          'disabled:opacity-30 disabled:cursor-not-allowed'
                        )}
                        title={t('player.transcript.shrinkEchoForward')}
                      >
                        <Icon icon="lucide:minus" className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleExpandEchoForward}
                        disabled={echoEndLineIndex >= lines.length - 1}
                        className={cn(
                          'p-1.5 rounded-full hover:bg-accent transition-colors text-muted-foreground hover:text-foreground',
                          'disabled:opacity-30 disabled:cursor-not-allowed'
                        )}
                        title={t('player.transcript.expandEchoForward')}
                      >
                        <Icon icon="lucide:chevron-down" className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="h-px bg-border flex-1 max-w-[60px]" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </ScrollArea>

      {/* Shadow Reading Panel - shown when echo mode is active */}
      {echoModeActive && echoRegionTimeRange && (
        <ShadowReadingPanel
          startTime={echoRegionTimeRange.startTime}
          endTime={echoRegionTimeRange.endTime}
          onRecord={handleRecord}
          isRecording={isRecording}
        />
      )}
    </div>
  )
}

