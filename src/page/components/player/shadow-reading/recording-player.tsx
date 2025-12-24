/**
 * RecordingPlayer Component
 *
 * Simple audio player for a single shadow reading recording.
 * Handles blob URL creation/cleanup and playback controls.
 */

import { useRef, useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { Icon } from '@iconify/react'
import { Button } from '@/page/components/ui/button'
import { Progress } from '@/page/components/ui/progress'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/page/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/page/components/ui/alert-dialog'
import { toast } from 'sonner'
import { usePlayerRecordingStore } from '@/page/stores/player/player-recording-store'
import { deleteRecording, updateRecording } from '@/page/db'
import { recordingQueryKeys } from '@/page/hooks/queries'
import { cn, createLogger } from '@/shared/lib/utils'
import { assessmentService } from '@/page/ai/services/assessment'
import { getAIServiceConfig } from '@/page/ai/core/config'
import { AssessmentResultDialog } from '@/page/components/player/assessment'
import type { Recording } from '@/page/types/db'

const log = createLogger({ name: 'RecordingPlayer' })

interface RecordingPlayerProps {
  /** The recording to play */
  recording: Recording
  className?: string
}

/**
 * Format seconds to MM:SS format
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Create a blob URL from a recording's blob data
 */
function createRecordingUrl(recording: Recording): string | null {
  if (!recording.blob) return null
  try {
    return URL.createObjectURL(recording.blob)
  } catch {
    return null
  }
}

/**
 * Get score color class based on score value
 * 91-100: excellent (green)
 * 81-90: good (blue)
 * 61-80: fair (orange/yellow)
 * <60: poor (red)
 */
function getScoreColorClass(score: number): string {
  if (score >= 91) {
    return 'bg-score-excellent text-score-excellent-foreground'
  } else if (score >= 81) {
    return 'bg-score-good text-score-good-foreground'
  } else if (score >= 61) {
    return 'bg-score-fair text-score-fair-foreground'
  } else {
    return 'bg-score-poor text-score-poor-foreground'
  }
}

export function RecordingPlayer({ recording, className }: RecordingPlayerProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isAssessing, setIsAssessing] = useState(false)
  const [showAssessmentDialog, setShowAssessmentDialog] = useState(false)

  // Create and cleanup blob URL when recording changes
  useEffect(() => {
    const url = createRecordingUrl(recording)
    setAudioUrl(url)

    // Reset playback state
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)

    return () => {
      if (url) {
        URL.revokeObjectURL(url)
      }
    }
  }, [recording.id, recording.blob]) // eslint-disable-line react-hooks/exhaustive-deps

  // Audio element lifecycle management
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio()
    }

    const audio = audioRef.current

    const handleLoadedMetadata = () => {
      setDuration(audio.duration)
    }

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
    }

    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }

    const handlePlay = () => {
      setIsPlaying(true)
    }

    const handlePause = () => {
      setIsPlaying(false)
    }

    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.pause()
      audio.src = ''
    }
  }, [])

  // Load audio source when URL changes
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    if (audioUrl) {
      audio.src = audioUrl
      audio.load()
    } else {
      audio.src = ''
    }
  }, [audioUrl])

  const handlePlayPause = useCallback(() => {
    const audio = audioRef.current
    if (!audio || !audioUrl) return

    if (isPlaying) {
      audio.pause()
    } else {
      audio.play().catch((error) => {
        log.error('Failed to play audio:', error)
        toast.error(t('player.transcript.playbackError'))
      })
    }
  }, [isPlaying, audioUrl])

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const audio = audioRef.current
      if (!audio || !audioUrl || duration === 0) return

      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left
      const percentage = x / rect.width
      const newTime = percentage * duration

      audio.currentTime = newTime
      setCurrentTime(newTime)
    },
    [audioUrl, duration]
  )

  // Download the recording as a file
  const handleDownload = useCallback(() => {
    if (!recording.blob || !audioUrl) return

    const a = document.createElement('a')
    a.href = audioUrl
    // Generate filename with date
    const date = recording.createdAt
      ? new Date(recording.createdAt).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
    a.download = `recording-${date}-${recording.id.slice(0, 8)}.webm`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }, [recording.blob, recording.id, recording.createdAt, audioUrl])

  // Delete the recording
  const handleDelete = useCallback(async () => {
    if (isDeleting) return

    setIsDeleting(true)
    try {
      // Stop playback first
      if (audioRef.current) {
        audioRef.current.pause()
      }

      // Delete from database
      await deleteRecording(recording.id)

      // Close the dialog
      setShowDeleteDialog(false)

      // Invalidate recordings queries to trigger refetch
      // Calculate the echo region from recording's reference times
      const startTime = Math.round(recording.referenceStart)
      const endTime = Math.round(recording.referenceStart + recording.referenceDuration)

      // Invalidate byEchoRegion query (for ShadowRecordingList)
      await queryClient.invalidateQueries({
        queryKey: recordingQueryKeys.byEchoRegion(
          recording.targetType,
          recording.targetId,
          recording.language,
          startTime,
          endTime
        ),
      })

      // Invalidate byTarget query (for transcript line recording counts)
      await queryClient.invalidateQueries({
        queryKey: recordingQueryKeys.byTarget(recording.targetType, recording.targetId),
      })
    } catch (error) {
      log.error('Failed to delete recording:', error)
      toast.error(t('player.transcript.deleteRecording.error'))
    } finally {
      setIsDeleting(false)
    }
  }, [recording, queryClient, isDeleting])

  const progressPercentage = duration === 0 ? 0 : (currentTime / duration) * 100

  // Handle assessment
  const handleAssessment = useCallback(async () => {
    // If assessment exists, show dialog
    if (recording.assessment) {
      setShowAssessmentDialog(true)
      return
    }

    // If no blob, can't assess
    if (!recording.blob) {
      toast.error(t('player.transcript.assessment.noRecording'))
      return
    }

    // Validate blob size
    if (recording.blob.size < 100) {
      log.warn('Recording blob is too small', { size: recording.blob.size })
      toast.error(t('player.transcript.assessment.noRecording'))
      return
    }

    // Start assessment
    setIsAssessing(true)
    try {
      const config = getAIServiceConfig('assessment')
      log.debug('Starting assessment', {
        blobSize: recording.blob.size,
        blobType: recording.blob.type,
        duration: recording.duration,
        language: recording.language,
        referenceText: recording.referenceText,
        referenceTextLength: recording.referenceText?.length || 0,
      })
      const result = await assessmentService.assess({
        audioBlob: recording.blob,
        referenceText: recording.referenceText,
        language: recording.language,
        config,
        durationMs: recording.duration, // duration in milliseconds
      })

      if (!result.success || !result.data) {
        throw new Error(result.error?.message || 'Assessment failed')
      }

      // Update recording with assessment result
      const assessmentResult = result.data
      const fullResult = assessmentResult.fullResult
      const pronunciationScore = assessmentResult.overallScore

      await updateRecording(recording.id, {
        assessment: fullResult,
        pronunciationScore,
      })

      // Invalidate queries to refresh UI
      await queryClient.invalidateQueries({
        queryKey: recordingQueryKeys.byTarget(recording.targetType, recording.targetId),
      })

      // Show dialog with results
      setShowAssessmentDialog(true)
      toast.success(t('player.transcript.assessment.success'))
    } catch (error) {
      log.error('Failed to assess pronunciation:', error)
      toast.error(t('player.transcript.assessment.error'))
    } finally {
      setIsAssessing(false)
    }
  }, [recording, queryClient, t])

  // Use refs to store latest values for the controls callbacks
  const isPlayingRef = useRef(isPlaying)
  const handlePlayPauseRef = useRef(handlePlayPause)
  useEffect(() => {
    isPlayingRef.current = isPlaying
    handlePlayPauseRef.current = handlePlayPause
  }, [isPlaying, handlePlayPause])

  // Register controls with player store for keyboard shortcuts
  const registerRecordingPlayerControls = usePlayerRecordingStore(
    (s) => s.registerRecordingPlayerControls
  )
  const unregisterRecordingPlayerControls = usePlayerRecordingStore(
    (s) => s.unregisterRecordingPlayerControls
  )

  useEffect(() => {
    registerRecordingPlayerControls({
      togglePlayback: () => handlePlayPauseRef.current(),
      isPlaying: () => isPlayingRef.current,
    })

    return () => {
      unregisterRecordingPlayerControls()
    }
  }, [registerRecordingPlayerControls, unregisterRecordingPlayerControls])

  // Don't render if no audio URL (no blob data)
  if (!audioUrl) {
    return null
  }

  // Get score for display
  const score = recording.pronunciationScore ?? recording.assessment?.NBest?.[0]?.PronunciationAssessment?.PronScore

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Play/Pause Button */}
      <Button
        variant="outline"
        size="icon"
        onClick={handlePlayPause}
        className="size-8 shrink-0 rounded-full cursor-pointer"
      >
        <Icon
          icon={isPlaying ? 'lucide:pause' : 'lucide:play'}
          className="h-4 w-4"
        />
      </Button>

      {/* Assessment Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleAssessment}
        disabled={isAssessing || !recording.blob}
        className={cn(
          'size-8 rounded-full shrink-0 cursor-pointer',
          score !== undefined && getScoreColorClass(score)
        )}
      >
        {isAssessing ? (
          <>
            <Icon icon="lucide:loader-2" className="size-4 animate-spin" />
          </>
        ) : score !== undefined ? (
          <span className="text-xs font-semibold">{Math.round(score)}</span>
        ) : (
          <>
            <Icon icon="lucide:check" className="size-4" />
          </>
        )}
      </Button>

      {/* Progress Bar */}
      <div className="flex-1 flex items-center gap-1">
        <span className="text-xs text-muted-foreground w-10 text-right">
          {formatTime(currentTime)}
        </span>
        <div
          className="relative h-2 w-full cursor-pointer flex-1"
          onClick={handleProgressClick}
        >
          <Progress value={progressPercentage} className="h-2" />
        </div>
        <span className="text-xs text-muted-foreground w-10">
          {formatTime(duration)}
        </span>
      </div>

      {/* More Actions Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 cursor-pointer"
          >
            <Icon icon="lucide:more-vertical" className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleDownload} disabled={!recording.blob}>
            <Icon icon="lucide:download" className="h-4 w-4 mr-2" />
            {t('common.download')}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            disabled={isDeleting}
            variant="destructive"
          >
            <Icon icon="lucide:trash-2" className="h-4 w-4 mr-2" />
            {t('common.delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('player.transcript.deleteRecording.title')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('player.transcript.deleteRecording.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Assessment Result Dialog */}
      {recording.assessment && (
        <AssessmentResultDialog
          open={showAssessmentDialog}
          onOpenChange={setShowAssessmentDialog}
          assessment={recording.assessment}
        />
      )}
    </div>
  )
}
