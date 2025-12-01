import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Volume2,
} from 'lucide-react'
import { type Translation } from '@/db'
import { getDefaultTTSVoice } from '@/services/ai/constants/tts-voices'
import { useSettingsStore } from '@/stores/settings'
import { AIProvider } from '@/services/ai/types'
import { getAIServiceConfig } from '@/services/ai/core/config'
import { AudioPlayer } from '@/components/voice-synthesis'
import { VoiceSynthesisSheet } from './voice-synthesis-sheet'
import { useTTS } from '@/hooks/use-tts'
import { useAudio } from '@/hooks/use-audio'
import { useCopyWithToast } from '@/hooks/use-copy-with-toast'

interface HistoryItemProps {
  translation: Translation
  isExpanded: boolean
  onToggle: () => void
}

export function HistoryItem({
  translation,
  isExpanded,
  onToggle,
}: HistoryItemProps) {
  const { t } = useTranslation()
  const { aiServices } = useSettingsStore()
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [selectedVoice, setSelectedVoice] = useState(() => {
    const ttsConfig = aiServices.tts
    const provider = ttsConfig?.defaultProvider || AIProvider.ENJOY
    const aiServiceConfig = getAIServiceConfig('tts')
    const byokProvider = aiServiceConfig.byok?.provider
    return getDefaultTTSVoice(provider, byokProvider, translation.targetLanguage)
  })

  // Use hooks for copy and audio management
  const { copy, copied } = useCopyWithToast()
  const { audio, audioUrl, updateAudio } = useAudio({
    loader: isExpanded
      ? { type: 'translationKey', translationKey: translation.id }
      : null,
    enabled: isExpanded,
  })

  // Use TTS hook for synthesis
  const { isSynthesizing, synthesize } = useTTS({
    language: translation.targetLanguage,
    voice: selectedVoice,
    translationKey: translation.id,
    onSuccess: (newAudio) => {
      // updateAudio will create the URL from the blob
      updateAudio(newAudio)
      setIsSheetOpen(false)
    },
  })

  const handleCopy = () => {
    void copy(translation.translatedText)
  }

  const handleSynthesize = () => {
    void synthesize(translation.translatedText)
  }

  return (
    <>
      <div className="border rounded-md">
        <button
          onClick={onToggle}
          className="w-full p-4 text-left hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{translation.sourceText}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(translation.createdAt).toLocaleString()}
              </p>
            </div>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
            )}
          </div>
        </button>
        {isExpanded && (
          <div className="p-4 space-y-4 border-t bg-muted/30">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-muted-foreground">
                  {t('translation.translatedText')}
                </Label>
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation()
                          void handleCopy()
                        }}
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {copied
                        ? t('translation.copied', { defaultValue: 'Copied!' })
                        : t('translation.copy', { defaultValue: 'Copy' })}
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation()
                          setIsSheetOpen(true)
                        }}
                      >
                        <Volume2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {audio
                        ? t('translation.regenerateAudio', { defaultValue: 'Regenerate audio' })
                        : t('translation.synthesizeAudio', { defaultValue: 'Synthesize audio' })}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
              <p className="text-sm whitespace-pre-wrap">{translation.translatedText}</p>
            </div>

            {/* Audio Player */}
            {audioUrl && (
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-xs font-medium text-muted-foreground">
                  {t('tts.generatedAudio', { defaultValue: 'Generated Audio' })}
                </Label>
                <div className="p-3 bg-background rounded-md">
                  <AudioPlayer audioUrl={audioUrl} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Voice Synthesis Sheet */}
      <VoiceSynthesisSheet
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        text={translation.translatedText}
        language={translation.targetLanguage}
        voice={selectedVoice}
        onVoiceChange={setSelectedVoice}
        onSynthesize={handleSynthesize}
        isSynthesizing={isSynthesizing}
      />
    </>
  )
}

