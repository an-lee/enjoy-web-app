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

      {/* Translation - Basic translation */}
      <AIServiceCard
        service={AIServiceType.TRANSLATION}
        title={t('settings.ai.translation', { defaultValue: 'Translation' })}
        description={t('settings.ai.translationDescription', {
          defaultValue: 'Basic translation. Enjoy uses dedicated API, Local/BYOK use LLM.'
        })}
        providers={[AIProvider.ENJOY, AIProvider.LOCAL, AIProvider.BYOK]}
      />

      {/* Contextual Translation - Context-aware translation */}
      <AIServiceCard
        service={AIServiceType.CONTEXTUAL_TRANSLATION}
        title={t('settings.ai.contextualTranslation', { defaultValue: 'Contextual Translation' })}
        description={t('settings.ai.contextualTranslationDescription', {
          defaultValue: 'Context-aware translation using surrounding text context. Uses LLM.'
        })}
        providers={[AIProvider.ENJOY, AIProvider.LOCAL, AIProvider.BYOK]}
      />

      {/* Dictionary - Contextual word lookup with AI explanation */}
      <AIServiceCard
        service={AIServiceType.DICTIONARY}
        title={t('settings.ai.dictionary', { defaultValue: 'Dictionary' })}
        description={t('settings.ai.dictionaryDescription', {
          defaultValue: 'Contextual word lookup with AI-powered explanation. Only Enjoy API supported.'
        })}
        providers={[AIProvider.ENJOY]}
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
