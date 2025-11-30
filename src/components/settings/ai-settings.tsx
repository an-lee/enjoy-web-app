import { Card, CardContent } from '@/components/ui/card'
import { useTranslation } from 'react-i18next'
import { AIServiceCard } from './ai-service-card'

interface AISettingsProps {
  searchQuery: string
  settingsByCategory: {
    ai: any[]
  }
}

export function AISettings({ searchQuery, settingsByCategory }: AISettingsProps) {
  const { t } = useTranslation()

  if (settingsByCategory.ai.length === 0 && searchQuery) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">
            {t('settings.noResults', { defaultValue: 'No settings found' })}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      {/* Smart Translation - Style-aware translation using LLM */}
      {(!searchQuery || settingsByCategory.ai.some(s => s.id === 'smartTranslation')) && (
        <AIServiceCard
          service="smartTranslation"
          title={t('settings.ai.smartTranslation', { defaultValue: 'Smart Translation' })}
          description={t('settings.ai.smartTranslationDescription', {
            defaultValue: 'Style-aware translation using LLM for user-generated content. Supports multiple translation styles.'
          })}
          providers={['enjoy', 'local', 'byok']}
        />
      )}

      {/* Dictionary - Contextual word lookup with AI explanation */}
      {(!searchQuery || settingsByCategory.ai.some(s => s.id === 'dictionary')) && (
        <AIServiceCard
          service="dictionary"
          title={t('settings.ai.dictionary', { defaultValue: 'Dictionary (Contextual)' })}
          description={t('settings.ai.dictionaryDescription', {
            defaultValue: 'Contextual word lookup with AI-powered explanation. Basic dictionary is always free.'
          })}
          providers={['enjoy', 'local', 'byok']}
        />
      )}

      {/* ASR - Automatic Speech Recognition (Whisper) */}
      {(!searchQuery || settingsByCategory.ai.some(s => s.id === 'asr')) && (
        <AIServiceCard
          service="asr"
          title={t('settings.ai.asr', { defaultValue: 'Speech Recognition (ASR)' })}
          description={t('settings.ai.asrDescription', {
            defaultValue: 'Automatic speech recognition using Whisper model for timestamped transcription.'
          })}
          providers={['enjoy', 'local', 'byok']}
        />
      )}

      {/* TTS - Text-to-Speech */}
      {(!searchQuery || settingsByCategory.ai.some(s => s.id === 'tts')) && (
        <AIServiceCard
          service="tts"
          title={t('settings.ai.tts', { defaultValue: 'Text-to-Speech (TTS)' })}
          description={t('settings.ai.ttsDescription', {
            defaultValue: 'Text-to-speech for generating audio for shadowing practice materials.'
          })}
          providers={['enjoy', 'local', 'byok']}
        />
      )}

      {/* Pronunciation Assessment - Azure Speech only */}
      {(!searchQuery || settingsByCategory.ai.some(s => s.id === 'assessment')) && (
        <AIServiceCard
          service="assessment"
          title={t('settings.ai.assessment', { defaultValue: 'Pronunciation Assessment' })}
          description={t('settings.ai.assessmentDescription', {
            defaultValue: 'Pronunciation assessment using Azure Speech Services (only provider that supports phoneme-level scoring).'
          })}
          providers={['enjoy', 'byok']}
        />
      )}
    </>
  )
}
