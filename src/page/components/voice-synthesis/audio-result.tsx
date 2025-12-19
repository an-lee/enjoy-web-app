import { useTranslation } from 'react-i18next'
import { Label } from '@/page/components/ui/label'
import { Button } from '@/page/components/ui/button'
import { Icon } from '@iconify/react'
import { cn } from '@/shared/lib/utils'
import { AudioPlayer } from './audio-player'

interface AudioResultProps {
  audioBlob: Blob | null
  audioUrl: string | null
  onRegenerate: () => void
  isRegenerating?: boolean
}

export function AudioResult({
  audioBlob,
  audioUrl,
  onRegenerate,
  isRegenerating = false,
}: AudioResultProps) {
  const { t } = useTranslation()

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
          <AudioPlayer audioUrl={audioUrl} />
        </div>
      </div>
      <div className="flex justify-end items-center gap-2">
        {audioBlob && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={!audioBlob}
          >
            <Icon icon="lucide:download" className="mr-2 h-4 w-4" />
            {t('tts.download')}
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={onRegenerate}
          disabled={isRegenerating}
        >
          <Icon
            icon="lucide:refresh-cw"
            className={cn('mr-2 h-4 w-4', isRegenerating && 'animate-spin')}
          />
          {t('tts.regenerate')}
        </Button>
      </div>
    </div>
  )
}

