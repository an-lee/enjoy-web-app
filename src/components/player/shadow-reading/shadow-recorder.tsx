/**
 * ShadowRecorder Component
 *
 * Independent component for shadow reading recording functionality.
 * Handles recording UI, visualization, and controls.
 */

import { useMemo, useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { Icon } from '@iconify/react'
import { usePlayerStore } from '@/stores/player'
import { useTranscriptDisplay, useEchoRegion, useRecorder } from '@/hooks/player'
import { recordingQueryKeys } from '@/hooks/queries'
import { RecordButton } from './record-button'
import { Button } from '@/components/ui/button'
import { ShadowRecordingProgress } from './shadow-recording-progress'
import { recordingRepository } from '@/db/repositories/recording-repository'
import { createLogger } from '@/lib/utils'
import type { TargetType, RecordingInput } from '@/types/db'

const log = createLogger({ name: 'ShadowRecorder' })

export function ShadowRecorder() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const canvasRef = useRef<HTMLDivElement>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Get echo region data from player store
  const echoStartTime = usePlayerStore((state) => state.echoStartTime)
  const echoEndTime = usePlayerStore((state) => state.echoEndTime)
  const echoModeActive = usePlayerStore((state) => state.echoModeActive)
  const currentSession = usePlayerStore((state) => state.currentSession)

  // Get transcript lines for reference text calculation
  const { lines } = useTranscriptDisplay()
  // Get echo region state (no lines needed, we only read state)
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

  // Initialize recording hook - only pass canvasRef
  const {
    isRecording,
    recordingDuration,
    startRecording,
    stopRecording,
    cancelRecording,
    error: recordingError,
  } = useRecorder({ canvasRef })

  // Combined error display
  const displayError = recordingError || saveError

  // Handle stop recording and save to database
  // Defined early so it can be used in refs
  const handleStopRecording = useCallback(async () => {
    if (!targetType || !targetId) {
      log.error('Cannot save recording: missing target info')
      return
    }

    setSaveError(null)

    const result = await stopRecording()
    if (!result) {
      return
    }

    const { blob, duration } = result

    try {
      // Calculate SHA-256 hash of the blob (MD5 is not supported in browser crypto API)
      // We'll use SHA-256 and store it in md5 field for compatibility
      const arrayBuffer = await blob.arrayBuffer()
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const md5 = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')

      // Create recording input
      const recordingInput: RecordingInput = {
        targetType,
        targetId,
        referenceStart: startTime * 1000, // Convert to milliseconds
        referenceDuration: (endTime - startTime) * 1000, // Convert to milliseconds
        referenceText,
        language,
        duration,
        md5,
        blob,
        syncStatus: 'pending',
      }

      // Save to database
      const recordingId = await recordingRepository.save(recordingInput)
      log.debug('Recording saved', { recordingId, duration })

      // Invalidate recordings query to trigger refetch in ShadowRecordingList
      // Query key uses milliseconds rounded to integers
      await queryClient.invalidateQueries({
        queryKey: recordingQueryKeys.byEchoRegion(
          targetType,
          targetId,
          language,
          Math.round(startTime * 1000),
          Math.round(endTime * 1000)
        ),
      })
    } catch (err: any) {
      const errorMsg = `Failed to save recording: ${err?.message || 'Unknown error'}`
      setSaveError(errorMsg)
      log.error('Failed to save recording', { error: err })
    }
  }, [
    stopRecording,
    queryClient,
    targetType,
    targetId,
    startTime,
    endTime,
    referenceText,
    language,
  ])

  // Use refs to store latest values for cleanup and to avoid stale closures
  const isRecordingRef = useRef(isRecording)
  const cancelRecordingRef = useRef(cancelRecording)
  const startRecordingRef = useRef(startRecording)
  const handleStopRecordingRef = useRef(handleStopRecording)

  // Update refs when values change
  useEffect(() => {
    isRecordingRef.current = isRecording
    cancelRecordingRef.current = cancelRecording
    startRecordingRef.current = startRecording
    handleStopRecordingRef.current = handleStopRecording
  }, [isRecording, cancelRecording, startRecording, handleStopRecording])

  // Register recording controls with player store for keyboard shortcuts
  // Use individual selectors to get stable function references
  const registerRecordingControls = usePlayerStore(
    (state) => state.registerRecordingControls
  )
  const unregisterRecordingControls = usePlayerStore(
    (state) => state.unregisterRecordingControls
  )

  // Register controls only once on mount - use refs to avoid re-triggering
  useEffect(() => {
    registerRecordingControls({
      startRecording: () => startRecordingRef.current(),
      stopRecording: async () => {
        await handleStopRecordingRef.current()
      },
      isRecording: () => isRecordingRef.current,
    })

    return () => {
      unregisterRecordingControls()
    }
  }, [registerRecordingControls, unregisterRecordingControls])

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
      await handleStopRecording()
    } else {
      setSaveError(null)
      await startRecording()
    }
  }, [isRecording, startRecording, handleStopRecording])

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
      {displayError && (
        <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
          {displayError}
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

