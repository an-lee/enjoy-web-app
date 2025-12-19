import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Label } from '@/page/components/ui/label'
import { Icon } from '@iconify/react'
import type { Audio } from '@/page/types/db'
import { AudioPlayer } from './audio-player'

interface AudioHistoryItemProps {
  audio: Audio
  isExpanded: boolean
  onToggle: () => void
}

export function AudioHistoryItem({
  audio,
  isExpanded,
  onToggle,
}: AudioHistoryItemProps) {
  const { t } = useTranslation()
  const [audioUrl, setAudioUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!audio.blob) return

    const url = URL.createObjectURL(audio.blob)
    setAudioUrl(url)

    return () => {
      URL.revokeObjectURL(url)
    }
  }, [audio.id, audio.blob])

  return (
    <div className="border rounded-md">
      <button
        onClick={onToggle}
        className="w-full p-4 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {audio.sourceText || t('tts.generatedAudio')}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(audio.createdAt).toLocaleString()}
            </p>
          </div>
          {isExpanded ? (
            <Icon icon="lucide:chevron-up" className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
          ) : (
            <Icon icon="lucide:chevron-down" className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
          )}
        </div>
      </button>
      {isExpanded && (
        <div className="p-4 space-y-3 border-t bg-muted/30">
          {audio.sourceText && (
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground">
                {t('tts.inputText')}
              </Label>
              <p className="text-sm whitespace-pre-wrap">{audio.sourceText}</p>
            </div>
          )}
          {audioUrl && (
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground">
                {t('tts.generatedAudio')}
              </Label>
              <AudioPlayer audioUrl={audioUrl} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}


