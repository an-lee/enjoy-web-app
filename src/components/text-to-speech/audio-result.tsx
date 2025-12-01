import { useTranslation } from 'react-i18next'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { RefreshCw, Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRef, useState, useEffect } from 'react'

interface AudioResultProps {
  audioBlob: Blob | null
  audioUrl: string | null
  text: string
  language: string
  onRegenerate: () => void
  isRegenerating?: boolean
}

export function AudioResult({
  audioBlob,
  audioUrl,
  text,
  language,
  onRegenerate,
  isRegenerating = false,
}: AudioResultProps) {
  const { t } = useTranslation()
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => setIsPlaying(false)

    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [])

  const handleDownload = () => {
    if (!audioBlob) return

    const url = URL.createObjectURL(audioBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tts-${Date.now()}.${audioBlob.type.includes('mp3') ? 'mp3' : 'wav'}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (!audioUrl) return null

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label className="text-sm font-medium text-muted-foreground">
          {t('tts.generatedAudio')}
        </Label>
        <div className="p-4 bg-muted rounded-md">
          <audio
            ref={audioRef}
            src={audioUrl}
            controls
            className="w-full"
            preload="metadata"
          />
        </div>
      </div>
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          <p className="font-medium">{text}</p>
          <p className="text-xs mt-1">{language}</p>
        </div>
        <div className="flex gap-2">
          {audioBlob && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={!audioBlob}
            >
              <Download className="mr-2 h-4 w-4" />
              {t('tts.download')}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onRegenerate}
            disabled={isRegenerating}
          >
            <RefreshCw
              className={cn('mr-2 h-4 w-4', isRegenerating && 'animate-spin')}
            />
            {t('tts.regenerate')}
          </Button>
        </div>
      </div>
    </div>
  )
}

