/**
 * Provider Selection Helper Functions
 * Automatically select provider based on user status and configuration
 */

import type { AIServiceConfig } from './types'
import { useAuthStore } from '@/stores/auth'

/**
 * Automatically select provider based on user status and configuration
 */
export function selectProvider(
  preferredProvider?: AIServiceConfig['provider'],
  serviceType?: 'asr' | 'translation' | 'dictionary' | 'tts' | 'assessment'
): AIServiceConfig['provider'] {
  // If provider is explicitly specified, use it
  if (preferredProvider) {
    return preferredProvider
  }

  const user = useAuthStore.getState().user
  const isPro = user?.isPro

  // Select default provider based on service type and user status
  switch (serviceType) {
    case 'asr':
    case 'translation':
      // ASR and translation support local mode, free users default to local
      return isPro ? 'enjoy' : 'local'

    case 'dictionary':
      // Dictionary lookup supports local mode, free users default to local
      return isPro ? 'enjoy' : 'local'

    case 'tts':
      // TTS supports local mode, free users default to local
      return isPro ? 'enjoy' : 'local'

    case 'assessment':
      // Pronunciation assessment doesn't support local mode, must use cloud
      return 'enjoy'

    default:
      return 'enjoy'
  }
}

