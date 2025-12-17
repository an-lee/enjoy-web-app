/**
 * RecordingPlayer Component
 *
 * Audio player for shadow reading recordings.
 * Displays play/pause controls, progress bar, and recording selection dropdown.
 */

import { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { RecordingWithUrl } from '@/hooks/queries'

interface RecordingPlayerProps {
  recordings: RecordingWithUrl[]
  className?: string
}

export function RecordingPlayer({
  recordings,
  className,
}: RecordingPlayerProps) {
  const { t } = useTranslation()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [selectedRecordingId, setSelectedRecordingId] = useState<string | null>(
    null
  )
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  // Select the first (newest) recording by default
  const selectedRecording = useMemo(() => {
    if (!selectedRecordingId && recordings.length > 0) {
      return recordings[0]
    }
    return recordings.find((r) => r.recording.id === selectedRecordingId) || null
  }, [recordings, selectedRecordingId])

  // Initialize audio element
  useEffect(() => {
    if (!selectedRecording) {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
        setIsPlaying(false)
        setCurrentTime(0)
        setDuration(0)
      }
      return
    }

    if (!audioRef.current) {
      audioRef.current = new Audio()
    }

    const audio = audioRef.current
    audio.src = selectedRecording.audioUrl

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

    // Load the audio
    audio.load()

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
    }
  }, [selectedRecording])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
        if (selectedRecording?.audioUrl) {
          // URL will be revoked by the query hook
        }
      }
    }
  }, [])

  // Update selected recording when recordings change
  useEffect(() => {
    if (recordings.length > 0 && !selectedRecordingId) {
      setSelectedRecordingId(recordings[0].recording.id)
    } else if (recordings.length === 0) {
      setSelectedRecordingId(null)
    } else if (
      selectedRecordingId &&
      !recordings.find((r) => r.recording.id === selectedRecordingId)
    ) {
      // Selected recording no longer exists, select the first one
      setSelectedRecordingId(recordings[0]?.recording.id || null)
    }
  }, [recordings, selectedRecordingId])

  const handlePlayPause = useCallback(() => {
    if (!audioRef.current || !selectedRecording) return

    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play().catch((error) => {
        console.error('Failed to play audio:', error)
      })
    }
  }, [isPlaying, selectedRecording])

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!audioRef.current || !selectedRecording || duration === 0) return

      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left
      const percentage = x / rect.width
      const newTime = percentage * duration

      audioRef.current.currentTime = newTime
      setCurrentTime(newTime)
    },
    [selectedRecording, duration]
  )

  const progressPercentage = useMemo(() => {
    if (duration === 0) return 0
    return (currentTime / duration) * 100
  }, [currentTime, duration])

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }, [])

  if (recordings.length === 0) {
    return null
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2">
        {/* Play/Pause Button */}
        <Button
          variant="outline"
          size="icon"
          onClick={handlePlayPause}
          disabled={!selectedRecording}
          className="h-9 w-9 shrink-0"
        >
          <Icon
            icon={isPlaying ? 'lucide:pause' : 'lucide:play'}
            className="h-4 w-4"
          />
        </Button>

        {/* Progress Bar */}
        <div className="flex-1 flex items-center gap-1">
          <span className="text-xs text-muted-foreground">{formatTime(currentTime)}</span>
          <div
            className="relative h-2 w-full cursor-pointer flex-1"
            onClick={handleProgressClick}
          >
            <Progress value={progressPercentage} className="h-2" />
          </div>
          <span className="text-xs text-muted-foreground">{formatTime(duration)}</span>
        </div>

        {/* Recording Selection Dropdown */}
        {recordings.length > 1 && (
          <Select
            value={selectedRecordingId || undefined}
            onValueChange={setSelectedRecordingId}
          >
            <SelectTrigger className="h-9 w-auto min-w-[120px] shrink-0">
              <SelectValue>
                {selectedRecording
                  ? t('player.transcript.recordingNumber', {
                      number: recordings.findIndex(
                        (r) => r.recording.id === selectedRecordingId
                      ) + 1,
                      defaultValue: `Recording ${recordings.findIndex(
                        (r) => r.recording.id === selectedRecordingId
                      ) + 1}`,
                    })
                  : t('player.transcript.selectRecording', {
                      defaultValue: 'Select Recording',
                    })}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {recordings.map((recording, index) => {
                const dateStr = recording.recording.createdAt
                  ? new Date(recording.recording.createdAt).toLocaleDateString()
                  : ''
                return (
                  <SelectItem
                    key={recording.recording.id}
                    value={recording.recording.id}
                  >
                    {t('player.transcript.recordingNumber', {
                      number: index + 1,
                      defaultValue: `Recording ${index + 1}`,
                    })}
                    {dateStr && ` (${dateStr})`}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  )
}

