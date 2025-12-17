/**
 * RecordingPlayer Component
 *
 * Audio player for shadow reading recordings.
 * Displays play/pause controls, progress bar, and recording selection dropdown.
 */

import { useRef, useEffect, useState, useCallback } from 'react'
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

/**
 * Format seconds to MM:SS format
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function RecordingPlayer({
  recordings,
  className,
}: RecordingPlayerProps) {
  const { t } = useTranslation()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  // Track which audio URL is currently loaded to prevent unnecessary reloads
  const loadedUrlRef = useRef<string | null>(null)

  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  // Derive selected recording from index - simple and stable
  const selectedRecording = recordings[selectedIndex] ?? recordings[0] ?? null
  const selectedRecordingId = selectedRecording?.recording.id ?? null

  // Reset selection when recordings array identity changes significantly
  // Only check if the current selection is still valid
  useEffect(() => {
    if (recordings.length === 0) {
      setSelectedIndex(0)
      return
    }

    // Check if current selection is still valid by ID
    const currentId = recordings[selectedIndex]?.recording.id
    if (currentId !== selectedRecordingId && selectedRecordingId) {
      // Try to find the previously selected recording in the new array
      const newIndex = recordings.findIndex(
        (r) => r.recording.id === selectedRecordingId
      )
      if (newIndex >= 0) {
        setSelectedIndex(newIndex)
      } else {
        // Recording no longer exists, reset to first
        setSelectedIndex(0)
      }
    } else if (selectedIndex >= recordings.length) {
      // Index out of bounds
      setSelectedIndex(0)
    }
  }, [recordings.length, selectedIndex, selectedRecordingId, recordings])

  // Audio element lifecycle management - single unified effect
  useEffect(() => {
    // Create audio element once
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
      loadedUrlRef.current = null
    }
  }, [])

  // Load audio source when selection changes
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const newUrl = selectedRecording?.audioUrl ?? null

    // Skip if URL hasn't changed
    if (newUrl === loadedUrlRef.current) return

    // Reset playback state
    audio.pause()
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)

    if (newUrl) {
      audio.src = newUrl
      loadedUrlRef.current = newUrl
      audio.load()
    } else {
      audio.src = ''
      loadedUrlRef.current = null
    }
  }, [selectedRecording?.audioUrl])

  const handlePlayPause = useCallback(() => {
    const audio = audioRef.current
    if (!audio || !selectedRecording) return

    if (isPlaying) {
      audio.pause()
    } else {
      audio.play().catch((error) => {
        console.error('Failed to play audio:', error)
      })
    }
  }, [isPlaying, selectedRecording])

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const audio = audioRef.current
      if (!audio || !selectedRecording || duration === 0) return

      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left
      const percentage = x / rect.width
      const newTime = percentage * duration

      audio.currentTime = newTime
      setCurrentTime(newTime)
    },
    [selectedRecording, duration]
  )

  const handleSelectionChange = useCallback(
    (recordingId: string) => {
      const index = recordings.findIndex((r) => r.recording.id === recordingId)
      if (index >= 0) {
        setSelectedIndex(index)
      }
    },
    [recordings]
  )

  const progressPercentage = duration === 0 ? 0 : (currentTime / duration) * 100

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
          <span className="text-xs text-muted-foreground">
            {formatTime(currentTime)}
          </span>
          <div
            className="relative h-2 w-full cursor-pointer flex-1"
            onClick={handleProgressClick}
          >
            <Progress value={progressPercentage} className="h-2" />
          </div>
          <span className="text-xs text-muted-foreground">
            {formatTime(duration)}
          </span>
        </div>

        {/* Recording Selection Dropdown */}
        {recordings.length > 1 && selectedRecordingId && (
          <Select value={selectedRecordingId} onValueChange={handleSelectionChange}>
            <SelectTrigger className="h-9 w-auto min-w-[120px] shrink-0">
              <SelectValue>
                {t('player.transcript.recordingNumber', {
                  number: selectedIndex + 1,
                  defaultValue: `Recording ${selectedIndex + 1}`,
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
