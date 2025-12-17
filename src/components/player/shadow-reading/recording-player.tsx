/**
 * RecordingPlayer Component
 *
 * Simple audio player for a single shadow reading recording.
 * Handles blob URL creation/cleanup and playback controls.
 */

import { useRef, useEffect, useState, useCallback } from 'react'
import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type { Recording } from '@/types/db'

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

export function RecordingPlayer({ recording, className }: RecordingPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

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
        console.error('Failed to play audio:', error)
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

  const progressPercentage = duration === 0 ? 0 : (currentTime / duration) * 100

  // Don't render if no audio URL (no blob data)
  if (!audioUrl) {
    return null
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Play/Pause Button */}
      <Button
        variant="outline"
        size="icon"
        onClick={handlePlayPause}
        className="h-8 w-8 shrink-0"
      >
        <Icon
          icon={isPlaying ? 'lucide:pause' : 'lucide:play'}
          className="h-4 w-4"
        />
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
    </div>
  )
}
