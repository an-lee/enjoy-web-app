import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { Label } from '@/page/components/ui/label'
import { Button } from '@/page/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/page/components/ui/tooltip'
import { Icon } from '@iconify/react'
import type { Translation } from '@/page/types/db'
import { getDefaultTTSVoice } from '@/ai/constants/tts-voices'
import { useSettingsStore } from '@/page/stores/settings'
import { AIProvider } from '@/ai/types'
import { getAIServiceConfig } from '@/ai/core/config'
import { AudioPlayer } from '@/page/components/voice-synthesis'
import { VoiceSynthesisSheet } from './voice-synthesis-sheet'
import { useTTS } from '@/page/hooks/use-tts'
import { useAudiosByTranslationKey } from '@/page/hooks/queries'
import { useCopyWithToast } from '@/page/hooks/use-copy-with-toast'

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
  const { audios, addAudio } = useAudiosByTranslationKey({
    translationKey: isExpanded ? translation.id : null,
    enabled: isExpanded,
  })

  // Use TTS hook for synthesis
  const { isSynthesizing, synthesize } = useTTS({
    language: translation.targetLanguage,
    voice: selectedVoice,
    translationKey: translation.id,
    onSuccess: (newAudio) => {
      // Add the new audio to the list (addAudio will create the URL from the blob)
      addAudio(newAudio)
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
              <Icon icon="lucide:chevron-up" className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
            ) : (
              <Icon icon="lucide:chevron-down" className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
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
                          <Icon icon="lucide:check" className="h-4 w-4 text-green-600" />
                        ) : (
                          <Icon icon="lucide:copy" className="h-4 w-4" />
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
                        <Icon icon="lucide:volume-2" className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {audios.length > 0
                        ? t('translation.regenerateAudio', { defaultValue: 'Regenerate audio' })
                        : t('translation.synthesizeAudio', { defaultValue: 'Synthesize audio' })}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
              <p className="text-sm whitespace-pre-wrap">{translation.translatedText}</p>
            </div>

            {/* Audio Players List */}
            {audios.length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-xs font-medium text-muted-foreground">
                  {t('tts.generatedAudio', { defaultValue: 'Generated Audio' })}
                  {audios.length > 1 && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({audios.length})
                    </span>
                  )}
                </Label>
                <div className="space-y-3">
                  {audios.map(({ audio, audioUrl }) => (
                    <div key={audio.id} className="p-3 bg-background rounded-md">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {audio.voice && (
                            <span className="font-medium">{audio.voice}</span>
                          )}
                          <span>
                            {new Date(audio.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <AudioPlayer audioUrl={audioUrl} />
                    </div>
                  ))}
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

