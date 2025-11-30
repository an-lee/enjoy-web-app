/**
 * Provider Selection Helper Functions
 * Automatically select provider based on user status and configuration
 */

import type { AIServiceConfig } from './types'
import { useAuthStore } from '@/stores/auth'
import { AI_PROVIDERS, SERVICE_TYPES } from './constants'

/**
 * Automatically select provider based on user status and configuration
 */
export function selectProvider(
  preferredProvider?: AIServiceConfig['provider'],
  serviceType?: 'asr' | 'smartTranslation' | 'dictionary' | 'tts' | 'assessment'
): AIServiceConfig['provider'] {
  // If provider is explicitly specified, use it
  if (preferredProvider) {
    return preferredProvider
  }

  const user = useAuthStore.getState().user
  const isPro = user?.isPro

  // Select default provider based on service type and user status
  switch (serviceType) {
    case SERVICE_TYPES.ASR:
    case SERVICE_TYPES.SMART_TRANSLATION:
      // ASR and smart translation support local mode, free users default to local
      return isPro ? AI_PROVIDERS.ENJOY : AI_PROVIDERS.LOCAL

    case SERVICE_TYPES.DICTIONARY:
      // Dictionary lookup supports local mode, free users default to local
      return isPro ? AI_PROVIDERS.ENJOY : AI_PROVIDERS.LOCAL

    case SERVICE_TYPES.TTS:
      // TTS supports local mode, free users default to local
      return isPro ? AI_PROVIDERS.ENJOY : AI_PROVIDERS.LOCAL

    case SERVICE_TYPES.ASSESSMENT:
      // Pronunciation assessment doesn't support local mode, must use cloud
      return AI_PROVIDERS.ENJOY

    default:
      return AI_PROVIDERS.ENJOY
  }
}

