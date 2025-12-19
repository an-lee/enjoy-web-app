import { useTranslation } from 'react-i18next'
import { Label } from '@/page/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/page/components/ui/select'
import { getTTSVoices, getDefaultTTSVoice } from '@/ai/constants/tts-voices'
import { useSettingsStore } from '@/page/stores/settings'
import { AIProvider } from '@/ai/types'
import { getAIServiceConfig } from '@/ai/core/config'

interface VoiceSelectorProps {
  voice: string
  onVoiceChange: (voice: string) => void
  language?: string
  disabled?: boolean
}

export function VoiceSelector({
  voice,
  onVoiceChange,
  language,
  disabled = false,
}: VoiceSelectorProps) {
  const { t } = useTranslation()
  const { aiServices } = useSettingsStore()

  // Get current provider configuration
  const ttsConfig = aiServices.tts
  const provider = ttsConfig?.defaultProvider || AIProvider.ENJOY
  const aiServiceConfig = getAIServiceConfig('tts')
  const byokProvider = aiServiceConfig.byok?.provider

  // Get available voices for current provider and language
  const availableVoices = getTTSVoices(provider, byokProvider, language)

  // If current voice is not in available voices, use default
  const currentVoice = availableVoices.find((v) => v.value === voice)
    ? voice
    : getDefaultTTSVoice(provider, byokProvider, language)

  return (
    <div className="space-y-2">
      <Label htmlFor="tts-voice">{t('tts.voice')}</Label>
      <Select value={currentVoice} onValueChange={onVoiceChange} disabled={disabled}>
        <SelectTrigger id="tts-voice" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {availableVoices.map((voiceOption) => (
            <SelectItem key={voiceOption.value} value={voiceOption.value}>
              {voiceOption.label}
              {voiceOption.description && (
                <span className="text-muted-foreground ml-2">
                  ({voiceOption.description})
                </span>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

