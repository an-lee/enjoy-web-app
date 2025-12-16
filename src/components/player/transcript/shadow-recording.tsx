/**
 * ShadowRecording Component
 *
 * Independent component for shadow reading recording functionality.
 * Handles recording UI, visualization, and controls.
 */

import { useMemo, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
import { useDisplayTime } from '@/hooks/use-display-time'
import { useShadowRecording } from '@/hooks/use-shadow-recording'
import { RecordButton } from './record-button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { TargetType } from '@/types/db'

interface ShadowRecordingProps {
  startTime: number // seconds
  endTime: number // seconds
  referenceText: string
  language: string
  targetType: TargetType
  targetId: string
  onRecordingStateChange?: (isRecording: boolean) => void
}

export function ShadowRecording({
  startTime,
  endTime,
  referenceText,
  language,
  targetType,
  targetId,
  onRecordingStateChange,
}: ShadowRecordingProps) {
  const { t } = useTranslation()
  const duration = (endTime - startTime) * 1000 // Convert to milliseconds
  const displayTime = useDisplayTime()

  // Initialize recording hook
  const {
    isRecording,
    recordingDuration,
    volume,
    startRecording,
    stopRecording,
    cancelRecording,
    error: recordingError,
  } = useShadowRecording({
    startTime: startTime * 1000, // Convert to milliseconds
    endTime: endTime * 1000, // Convert to milliseconds
    referenceText,
    language,
    targetType,
    targetId,
  })

  // Notify parent of recording state changes
  useEffect(() => {
    onRecordingStateChange?.(isRecording)
  }, [isRecording, onRecordingStateChange])

  // ESC key shortcut to cancel recording
  useEffect(() => {
    if (!isRecording) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        cancelRecording()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isRecording, cancelRecording])

  // Handle record button click
  const handleRecordClick = useCallback(async () => {
    if (isRecording) {
      await stopRecording()
    } else {
      await startRecording()
    }
  }, [isRecording, startRecording, stopRecording])

  // Calculate recording progress percentage (0-100)
  const recordingProgress = useMemo(() => {
    if (!isRecording || duration === 0) return 0
    return Math.min((recordingDuration / duration) * 100, 100)
  }, [isRecording, recordingDuration, duration])

  // Calculate ideal progress percentage (based on echo region duration)
  const idealProgress = useMemo(() => {
    if (!Number.isFinite(displayTime) || duration === 0) return 0
    if (displayTime < startTime) return 0
    if (displayTime >= endTime) return 100
    return ((displayTime - startTime) / (endTime - startTime)) * 100
  }, [displayTime, startTime, endTime, duration])

  // Progress bar color based on how well user is matching the pace
  // Green: on track, Yellow: slightly off, Red: too slow
  const progressColor = useMemo(() => {
    if (!isRecording) return 'bg-highlight-active-foreground'
    const diff = recordingProgress - idealProgress
    if (diff < -20) return 'bg-destructive' // Too slow
    if (diff < -10) return 'bg-yellow-500' // Slightly slow
    if (diff < 10) return 'bg-green-500' // On track
    if (diff < 20) return 'bg-yellow-500' // Slightly fast
    return 'bg-orange-500' // Too fast
  }, [isRecording, recordingProgress, idealProgress])

  // Volume visualization bars (0-100)
  const volumeBars = useMemo(() => {
    const barCount = 20
    const bars: number[] = []
    for (let i = 0; i < barCount; i++) {
      const threshold = (i / barCount) * 100
      bars.push(volume > threshold ? 1 : 0)
    }
    return bars
  }, [volume])

  return (
    <div className="space-y-3">
      {/* Recording progress bar - shows ideal pace vs actual recording */}
      {isRecording && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {t('player.transcript.recordingProgress', { defaultValue: 'Recording Progress' })}
            </span>
            <span className="font-medium">
              {Math.round(recordingProgress)}% / {Math.round(idealProgress)}%
            </span>
          </div>
          <div className="relative">
            {/* Ideal progress (background, subtle) */}
            <Progress
              value={idealProgress}
              className="h-2 bg-highlight-active-foreground/20"
            />
            {/* Actual recording progress (foreground, colored) */}
            <div
              className={cn(
                'absolute top-0 left-0 h-2 rounded-full transition-all',
                progressColor
              )}
              style={{ width: `${recordingProgress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {recordingProgress < idealProgress - 10
              ? t('player.transcript.recordingTooSlow', {
                  defaultValue: 'Try to match the pace',
                })
              : recordingProgress > idealProgress + 10
                ? t('player.transcript.recordingTooFast', {
                    defaultValue: 'Slow down a bit',
                  })
                : t('player.transcript.recordingOnTrack', {
                    defaultValue: 'Good pace!',
                  })}
          </p>
        </div>
      )}

      {/* Volume visualization */}
      {isRecording && (
        <div className="flex items-center justify-center gap-1 h-8">
          {volumeBars.map((bar, index) => (
            <div
              key={index}
              className={cn(
                'w-1 rounded-full transition-all duration-75',
                bar > 0
                  ? 'bg-highlight-active-foreground'
                  : 'bg-highlight-active-foreground/20'
              )}
              style={{
                height: `${bar * 100}%`,
                minHeight: '4px',
              }}
            />
          ))}
        </div>
      )}

      {/* Error message */}
      {recordingError && (
        <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
          {recordingError}
        </div>
      )}

      {/* Recording controls */}
      <div className="flex items-center justify-center gap-3 pt-1">
        <RecordButton
          isRecording={isRecording}
          onRecord={handleRecordClick}
        />
        {isRecording && (
          <Button
            variant="outline"
            size="lg"
            className="rounded-full"
            onClick={cancelRecording}
            title={t('player.transcript.cancelRecording', { defaultValue: 'Cancel Recording (ESC)' })}
          >
            <Icon icon="lucide:x" className="w-5 h-5" />
            <span>{t('player.transcript.cancel', { defaultValue: 'Cancel' })}</span>
          </Button>
        )}
      </div>
    </div>
  )
}

