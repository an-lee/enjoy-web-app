import { useTranslation } from 'react-i18next'
import { AIServiceCard } from './ai-service-card'
import { AIServiceType, AIProvider } from '@/page/ai/types'

export function AISettings() {
  const { t } = useTranslation()

  return (
    <>
      {/* Smart Translation - Style-aware translation using LLM */}
      <AIServiceCard
        service={AIServiceType.SMART_TRANSLATION}
        title={t('settings.ai.smartTranslation', { defaultValue: 'Smart Translation' })}
        description={t('settings.ai.smartTranslationDescription', {
          defaultValue: 'Style-aware translation using LLM for user-generated content. Supports multiple translation styles.'
        })}
        providers={[AIProvider.ENJOY, AIProvider.LOCAL, AIProvider.BYOK]}
      />

      {/* Smart Dictionary - Contextual word lookup with AI explanation */}
      <AIServiceCard
        service={AIServiceType.SMART_DICTIONARY}
        title={t('settings.ai.smartDictionary', { defaultValue: 'Smart Dictionary (Contextual)' })}
        description={t('settings.ai.smartDictionaryDescription', {
          defaultValue: 'Contextual word lookup with AI-powered explanation. Basic dictionary is always free.'
        })}
        providers={[AIProvider.ENJOY, AIProvider.LOCAL, AIProvider.BYOK]}
      />

      {/* ASR - Automatic Speech Recognition (Whisper) */}
      <AIServiceCard
        service={AIServiceType.ASR}
        title={t('settings.ai.asr', { defaultValue: 'Speech Recognition (ASR)' })}
        description={t('settings.ai.asrDescription', {
          defaultValue: 'Automatic speech recognition using Whisper model for timestamped transcription.'
        })}
        providers={[AIProvider.ENJOY, AIProvider.LOCAL, AIProvider.BYOK]}
      />

      {/* TTS - Text-to-Speech */}
      <AIServiceCard
        service={AIServiceType.TTS}
        title={t('settings.ai.tts', { defaultValue: 'Text-to-Speech (TTS)' })}
        description={t('settings.ai.ttsDescription', {
          defaultValue: 'Text-to-speech for generating audio for shadowing practice materials.'
        })}
        providers={[AIProvider.ENJOY, AIProvider.LOCAL, AIProvider.BYOK]}
      />

      {/* Pronunciation Assessment - Azure Speech only */}
      <AIServiceCard
        service={AIServiceType.ASSESSMENT}
        title={t('settings.ai.assessment', { defaultValue: 'Pronunciation Assessment' })}
        description={t('settings.ai.assessmentDescription', {
          defaultValue: 'Pronunciation assessment using Azure Speech Services (only provider that supports phoneme-level scoring).'
        })}
        providers={[AIProvider.ENJOY, AIProvider.BYOK]}
      />
    </>
  )
}
