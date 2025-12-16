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
import { Button } from '@/components/ui/button'
import { ShadowRecordingProgress } from './shadow-recording-progress'
import type { TargetType } from '@/types/db'

export function ShadowRecorder() {
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
        (line) =>
          line.index >= echoStartLineIndex && line.index <= echoEndLineIndex
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
  const echoRegionDuration = (endTime - startTime) * 1000 // Convert to milliseconds

  // Early return if echo mode is not active or data is invalid
  if (
    !echoModeActive ||
    startTime < 0 ||
    endTime < 0 ||
    !targetType ||
    !targetId
  ) {
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
    referenceStart: startTime * 1000, // Convert to milliseconds
    referenceDuration: (endTime - startTime) * 1000, // Convert to milliseconds
    referenceText,
    language,
    targetType,
    targetId,
    canvasRef,
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
  const { registerRecordingControls, unregisterRecordingControls } =
    usePlayerStore()
  useEffect(() => {
    registerRecordingControls({
      startRecording,
      stopRecording,
      isRecording: () => isRecording,
    })

    return () => {
      unregisterRecordingControls()
    }
  }, [
    isRecording,
    startRecording,
    stopRecording,
    registerRecordingControls,
    unregisterRecordingControls,
  ])

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

  return (
    <div className="space-y-3">
      {/* Recording progress and visualization */}
      <ShadowRecordingProgress
        isRecording={isRecording}
        recordingDuration={recordingDuration}
        echoRegionDuration={echoRegionDuration}
        canvasRef={canvasRef}
      />

      {/* Error message */}
      {recordingError && (
        <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
          {recordingError}
        </div>
      )}

      {/* Recording controls */}
      <div className="flex items-center justify-center gap-3 pt-1">
        <RecordButton isRecording={isRecording} onRecord={handleRecordClick} />
        {isRecording && (
          <Button
            variant="outline"
            size="lg"
            className="rounded-full"
            onClick={cancelRecording}
            title={t('player.transcript.cancelRecording', {
              defaultValue: 'Cancel Recording (ESC)',
            })}
          >
            <Icon icon="lucide:x" className="w-5 h-5" />
            <span>
              {t('player.transcript.cancel', { defaultValue: 'Cancel' })}
            </span>
          </Button>
        )}
      </div>
    </div>
  )
}
