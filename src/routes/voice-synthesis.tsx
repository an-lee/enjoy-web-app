import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { ttsService } from '@/services/ai/services'
import { getAIServiceConfig } from '@/services/ai/core/config'
import { useSettingsStore } from '@/stores/settings'
import {
  TextInput,
  LanguageSelector,
  VoiceSelector,
  AudioResult,
  ErrorAlert,
} from '@/components/text-to-speech'
import { getDefaultTTSVoice, getTTSVoices } from '@/services/ai/constants/tts-voices'
import { AIProvider } from '@/services/ai/types'

export const Route = createFileRoute('/voice-synthesis')({
  component: VoiceSynthesis,
})

function VoiceSynthesis() {
  const { t } = useTranslation()
  const { learningLanguage, aiServices } = useSettingsStore()

  // Initialize with user's learning language
  const [targetLanguage, setTargetLanguage] = useState(learningLanguage)

  // Initialize voice based on current provider
  const ttsConfig = aiServices.tts
  const provider = ttsConfig?.defaultProvider || AIProvider.ENJOY
  const aiServiceConfig = getAIServiceConfig('tts')
  const byokProvider = aiServiceConfig.byok?.provider
  const [selectedVoice, setSelectedVoice] = useState(() =>
    getDefaultTTSVoice(provider, byokProvider)
  )

  const [inputText, setInputText] = useState('')
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isSynthesizing, setIsSynthesizing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Update language when settings change
  useEffect(() => {
    setTargetLanguage(learningLanguage)
  }, [learningLanguage])

  // Update voice when provider or language changes
  useEffect(() => {
    const newProvider = aiServices.tts?.defaultProvider || AIProvider.ENJOY
    const newConfig = getAIServiceConfig('tts')
    const newByokProvider = newConfig.byok?.provider
    const availableVoices = getTTSVoices(newProvider, newByokProvider, targetLanguage)

    // Only update if current voice is not available for the new language/provider
    const isCurrentVoiceAvailable = availableVoices.some((v: { value: string }) => v.value === selectedVoice)

    if (!isCurrentVoiceAvailable) {
      const defaultVoice = getDefaultTTSVoice(newProvider, newByokProvider, targetLanguage)
      setSelectedVoice(defaultVoice)
    }
  }, [aiServices.tts, targetLanguage])

  // Clean up audio URL when component unmounts or audio changes
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [audioUrl])

  // Handle input clear
  const handleClearInput = () => {
    setInputText('')
    setAudioBlob(null)
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
      setAudioUrl(null)
    }
    setError(null)
  }

  const handleSynthesize = async () => {
    if (!inputText.trim()) return

    setIsSynthesizing(true)
    setError(null)

    // Clean up previous audio URL
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
      setAudioUrl(null)
    }
    setAudioBlob(null)

    try {
      const config = getAIServiceConfig('tts')
      const result = await ttsService.synthesize({
        text: inputText.trim(),
        language: targetLanguage,
        voice: selectedVoice,
        config,
      })

      if (!result.success || !result.data) {
        throw new Error(result.error?.message || t('tts.error'))
      }

      const blob = result.data.audioBlob
      if (!blob) {
        throw new Error(t('tts.noAudioGenerated'))
      }

      setAudioBlob(blob)
      const url = URL.createObjectURL(blob)
      setAudioUrl(url)
    } catch (err) {
      setError(t('tts.error'))
      console.error('TTS synthesis failed:', err)
    } finally {
      setIsSynthesizing(false)
    }
  }

  const handleRegenerate = async () => {
    if (!inputText.trim()) return

    setIsSynthesizing(true)
    setError(null)

    // Clean up previous audio URL
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
      setAudioUrl(null)
    }
    setAudioBlob(null)

    try {
      const config = getAIServiceConfig('tts')
      const result = await ttsService.synthesize({
        text: inputText.trim(),
        language: targetLanguage,
        voice: selectedVoice,
        config,
      })

      if (!result.success || !result.data) {
        throw new Error(result.error?.message || t('tts.error'))
      }

      const blob = result.data.audioBlob
      if (!blob) {
        throw new Error(t('tts.noAudioGenerated'))
      }

      setAudioBlob(blob)
      const url = URL.createObjectURL(blob)
      setAudioUrl(url)
    } catch (err) {
      setError(t('tts.error'))
      console.error('TTS regeneration failed:', err)
    } finally {
      setIsSynthesizing(false)
    }
  }

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <div className="space-y-6">
        {/* Input Section */}
        <div className="space-y-4">
          <LanguageSelector
            language={targetLanguage}
            onLanguageChange={setTargetLanguage}
            disabled={isSynthesizing}
          />

          <VoiceSelector
            voice={selectedVoice}
            onVoiceChange={setSelectedVoice}
            language={targetLanguage}
            disabled={isSynthesizing}
          />

          <TextInput
            value={inputText}
            onChange={setInputText}
            onClear={handleClearInput}
            disabled={isSynthesizing}
          />

          <div className="flex justify-end">
            <Button
              onClick={handleSynthesize}
              disabled={!inputText.trim() || isSynthesizing}
            >
              {isSynthesizing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('tts.synthesizing')}
                </>
              ) : (
                t('tts.synthesize')
              )}
            </Button>
          </div>
        </div>

        {/* Audio Result */}
        {audioUrl && (
          <AudioResult
            audioBlob={audioBlob}
            audioUrl={audioUrl}
            text={inputText.trim()}
            language={targetLanguage}
            onRegenerate={handleRegenerate}
            isRegenerating={isSynthesizing}
          />
        )}

        {/* Error Message */}
        {error && <ErrorAlert message={error} />}
      </div>
    </div>
  )
}
