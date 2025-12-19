import { useRef, useState, useEffect } from 'react'
import { Icon } from '@iconify/react'
import { Button } from '@/page/components/ui/button'
import { Slider } from '@/page/components/ui/slider'
import { cn } from '@/lib/utils'

interface AudioPlayerProps {
  audioUrl: string
  className?: string
}

export function AudioPlayer({ audioUrl, className }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isVolumeOpen, setIsVolumeOpen] = useState(false)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateTime = () => setCurrentTime(audio.currentTime)
    const updateDuration = () => setDuration(audio.duration || 0)
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }

    audio.addEventListener('timeupdate', updateTime)
    audio.addEventListener('loadedmetadata', updateDuration)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', updateTime)
      audio.removeEventListener('loadedmetadata', updateDuration)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('ended', handleEnded)
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

