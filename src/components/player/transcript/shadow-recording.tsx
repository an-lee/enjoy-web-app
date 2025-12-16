/**
 * ShadowRecording Component
 *
 * Independent component for shadow reading recording functionality.
 * Handles recording UI, visualization, and controls.
 */

import { useMemo, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
import { useShadowRecording } from '@/hooks/use-shadow-recording'
import { usePlayerStore } from '@/stores/player'
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

  // Use refs to store latest values for cleanup
  const isRecordingRef = useRef(isRecording)
  const cancelRecordingRef = useRef(cancelRecording)

  // Update refs when values change
  useEffect(() => {
    isRecordingRef.current = isRecording
    cancelRecordingRef.current = cancelRecording
  }, [isRecording, cancelRecording])

  // Register recording controls with player store for keyboard shortcuts
  const { registerRecordingControls, unregisterRecordingControls } = usePlayerStore()
  useEffect(() => {
    registerRecordingControls({
      startRecording,
      stopRecording,
      isRecording: () => isRecording,
    })

    return () => {
      unregisterRecordingControls()
    }
  }, [isRecording, startRecording, stopRecording, registerRecordingControls, unregisterRecordingControls])

  // Cancel recording when component unmounts if still recording
  useEffect(() => {
    return () => {
      // Check if recording is still active when component unmounts
      // Use refs to access latest values in cleanup
      if (isRecordingRef.current) {
        cancelRecordingRef.current()
      }
    }
  }, []) // Empty deps - only run on mount/unmount

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
  // Progress = recording duration / echo region total duration
  // When exceeds 100%, cap at 100%
  const recordingProgress = useMemo(() => {
    if (!isRecording || duration === 0) return 0
    return Math.min((recordingDuration / duration) * 100, 100)
  }, [isRecording, recordingDuration, duration])

  // Progress bar color based on how close to 100% (echo region duration)
  // Green: 0-70% (normal), Yellow: 70-90% (approaching), Orange: 90-100% (nearly done), Red: 100% (completed/exceeded)
  const progressColor = useMemo(() => {
    if (!isRecording) return 'bg-highlight-active-foreground'
    if (recordingProgress >= 100) return 'bg-destructive' // Completed/exceeded
    if (recordingProgress >= 90) return 'bg-orange-500' // Nearly done
    if (recordingProgress >= 70) return 'bg-yellow-500' // Approaching limit
    return 'bg-green-500' // Normal progress
  }, [isRecording, recordingProgress])

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
      {/* Recording progress bar - shows recording duration as percentage of echo region total duration */}
      {isRecording && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {t('player.transcript.recordingProgress', { defaultValue: 'Recording Progress' })}
            </span>
            <span className="font-medium">
              {Math.round(recordingProgress)}%
            </span>
          </div>
          <div className="relative">
            {/* Background progress bar (100% = echo region total duration) */}
            <Progress
              value={100}
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
            {recordingProgress >= 100
              ? t('player.transcript.recordingCompleted', {
                  defaultValue: 'Recording completed',
                })
              : recordingProgress >= 90
                ? t('player.transcript.recordingNearlyDone', {
                    defaultValue: 'Nearly done',
                  })
                : recordingProgress >= 70
                  ? t('player.transcript.recordingApproaching', {
                      defaultValue: 'Approaching time limit',
                    })
                  : t('player.transcript.recordingInProgress', {
                      defaultValue: 'Recording in progress',
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

