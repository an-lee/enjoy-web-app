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
import { useTranscriptDisplay } from './use-transcript-display'
import { useEchoRegion } from './use-echo-region'
import { RecordButton } from './record-button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { RecordingPlayer } from './recording-player'
import { useRecordingsByEchoRegion } from '@/hooks/queries'
import type { TargetType } from '@/types/db'

export function ShadowRecording() {
  const { t } = useTranslation()
  const canvasRef = useRef<HTMLDivElement>(null)

  // Get echo region data from player store
  const echoStartTime = usePlayerStore((state) => state.echoStartTime)
  const echoEndTime = usePlayerStore((state) => state.echoEndTime)
  const echoModeActive = usePlayerStore((state) => state.echoModeActive)
  const currentSession = usePlayerStore((state) => state.currentSession)

  // Get transcript lines for reference text calculation
  const { lines } = useTranscriptDisplay()
  const { echoStartLineIndex, echoEndLineIndex } = useEchoRegion()

  // Calculate reference text from echo region lines
  const referenceText = useMemo(() => {
    if (!echoModeActive || echoStartLineIndex < 0 || echoEndLineIndex < 0) {
      return ''
    }
    return lines
      .filter(
        (line) => line.index >= echoStartLineIndex && line.index <= echoEndLineIndex
      )
      .map((line) => line.primary.text)
      .join(' ')
  }, [echoModeActive, echoStartLineIndex, echoEndLineIndex, lines])

  // Get target info from current session
  const targetType: TargetType | null = useMemo(() => {
    if (!currentSession) return null
    return currentSession.mediaType === 'audio' ? 'Audio' : 'Video'
  }, [currentSession])

  const targetId = currentSession?.mediaId || ''
  const language = currentSession?.language || 'en'

  // Use echo region times (already in seconds)
  const startTime = echoStartTime >= 0 ? echoStartTime : 0
  const endTime = echoEndTime >= 0 ? echoEndTime : 0
  const duration = (endTime - startTime) * 1000 // Convert to milliseconds

  // Early return if echo mode is not active or data is invalid
  if (!echoModeActive || startTime < 0 || endTime < 0 || !targetType || !targetId) {
    return null
  }

  // Initialize recording hook
  const {
    isRecording,
    recordingDuration,
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
    canvasRef,
  })

  // Query recordings for this echo region (only when not recording)
  const { recordings: existingRecordings } = useRecordingsByEchoRegion({
    targetType,
    targetId,
    language,
    startTime: startTime * 1000, // Convert to milliseconds
    endTime: endTime * 1000, // Convert to milliseconds
    enabled: !isRecording, // Only query when not recording
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


  return (
    <div className="space-y-3">
      {/* Existing recordings player - show when not recording and recordings exist */}
      {!isRecording && existingRecordings.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">
            {t('player.transcript.existingRecordings', {
              defaultValue: 'Existing Recordings',
            })}
          </div>
          <RecordingPlayer recordings={existingRecordings} />
        </div>
      )}

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

      {/* Frequency histogram visualization */}
      {isRecording && (
        <div
          ref={canvasRef}
          className="flex items-center justify-center h-8 w-full"
          style={{ minHeight: '32px' }}
        />
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

