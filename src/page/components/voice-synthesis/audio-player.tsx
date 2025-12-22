import { useRef, useState, useEffect } from 'react'
import { Icon } from '@iconify/react'
import { Button } from '@/page/components/ui/button'
import { Slider } from '@/page/components/ui/slider'
import { cn } from '@/shared/lib/utils'
import type { Audio } from '@/page/types/db'
import { getMediaUrl } from '@/page/lib/file-access'

interface AudioPlayerProps {
  audio?: Audio
  audioUrl?: string
  className?: string
}

export function AudioPlayer({ audio, audioUrl: providedAudioUrl, className }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(providedAudioUrl || null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isVolumeOpen, setIsVolumeOpen] = useState(false)

  // Create audio URL on demand (lazy loading) if Audio object is provided
  useEffect(() => {
    // If audioUrl is provided directly, use it
    if (providedAudioUrl) {
      setAudioUrl(providedAudioUrl)
      return
    }

    // If Audio object is provided, create URL on demand
    if (!audio) {
      setAudioUrl(null)
      return
    }

    let mounted = true
    let url: string | null = null

    getMediaUrl(audio)
      .then((mediaUrl) => {
        if (mounted) {
          url = mediaUrl
          setAudioUrl(mediaUrl)
        }
      })
      .catch((error) => {
        console.error('Failed to create audio URL:', error)
        if (mounted) {
          setAudioUrl(null)
        }
      })

    return () => {
      mounted = false
      if (url) {
        URL.revokeObjectURL(url)
      }
    }
  }, [audio?.id, audio?.mediaUrl, audio?.blob, audio?.fileHandle, providedAudioUrl])

  // Audio event handlers
  useEffect(() => {
    const audioElement = audioRef.current
    if (!audioElement || !audioUrl) return

    const updateTime = () => setCurrentTime(audioElement.currentTime)
    const updateDuration = () => setDuration(audioElement.duration || 0)
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }

    audioElement.addEventListener('timeupdate', updateTime)
    audioElement.addEventListener('loadedmetadata', updateDuration)
    audioElement.addEventListener('play', handlePlay)
    audioElement.addEventListener('pause', handlePause)
    audioElement.addEventListener('ended', handleEnded)

    return () => {
      audioElement.removeEventListener('timeupdate', updateTime)
      audioElement.removeEventListener('loadedmetadata', updateDuration)
      audioElement.removeEventListener('play', handlePlay)
      audioElement.removeEventListener('pause', handlePause)
      audioElement.removeEventListener('ended', handleEnded)
    }
  }, [audioUrl])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
    } else {
      audio.play()
    }
  }

  const handleSeek = (value: number[]) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = value[0]
    setCurrentTime(value[0])
  }

  const handleVolumeChange = (value: number[]) => {
    const audio = audioRef.current
    if (!audio) return
    const newVolume = value[0]
    audio.volume = newVolume
    setVolume(newVolume)
    setIsMuted(newVolume === 0)
  }

  const toggleVolumePanel = () => {
    setIsVolumeOpen((prev) => !prev)
  }

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!audioUrl) {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
          Loading audio...
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      <div className="relative flex items-center gap-3">
        <Button
          variant="default"
          size="icon"
          onClick={togglePlay}
          className="size-10 sm:size-12 rounded-full shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
        >
          {isPlaying ? (
            <Icon icon="lucide:pause" className="h-5 w-5 sm:h-6 sm:w-6" />
          ) : (
            <Icon icon="lucide:play" className="h-5 w-5 sm:h-6 sm:w-6 ml-0.5" />
          )}
        </Button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2.5 shadow-sm">
            <span className="w-12 shrink-0 text-xs sm:text-sm tabular-nums text-muted-foreground text-center font-medium">
              {formatTime(currentTime)}
            </span>
            <Slider
              value={[currentTime]}
              max={duration || 0}
              step={0.1}
              onValueChange={handleSeek}
              className="flex-1"
            />
            <span className="w-12 shrink-0 text-center text-xs sm:text-sm tabular-nums text-muted-foreground font-medium">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleVolumePanel}
              className="h-9 w-9 rounded-full hover:bg-accent transition-colors"
            >
              {isMuted || volume === 0 ? (
                <Icon icon="lucide:volume-x" className="h-4 w-4" />
              ) : (
                <Icon icon="lucide:volume-2" className="h-4 w-4" />
              )}
            </Button>
            {isVolumeOpen && (
              <div className="absolute bottom-12 left-1/2 z-10 -translate-x-1/2 rounded-xl border bg-popover px-3 py-3 shadow-lg backdrop-blur-sm">
                <Slider
                  orientation="vertical"
                  value={[isMuted ? 0 : volume]}
                  max={1}
                  step={0.01}
                  onValueChange={handleVolumeChange}
                  className="h-24 w-6"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

