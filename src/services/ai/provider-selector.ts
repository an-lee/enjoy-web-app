/**
 * Provider Selection Helper Functions
 * Automatically select provider based on user status and configuration
 */

import type { AIServiceConfig } from './types'
import { useAuthStore } from '@/stores/auth'
import { AIProvider, AIServiceType } from './types'

/**
 * Automatically select provider based on user status and configuration
 */
export function selectProvider(
  preferredProvider?: AIServiceConfig['provider'],
  serviceType?: AIServiceType
): AIServiceConfig['provider'] {
  // If provider is explicitly specified, use it
  if (preferredProvider) {
    return preferredProvider
  }

  const user = useAuthStore.getState().user
  const isPro = user?.isPro

  // Select default provider based on service type and user status
  switch (serviceType) {
    case AIServiceType.ASR:
    case AIServiceType.SMART_TRANSLATION:
      // ASR and smart translation support local mode, free users default to local
      return isPro ? AIProvider.ENJOY : AIProvider.LOCAL

    case AIServiceType.DICTIONARY:
      // Dictionary lookup supports local mode, free users default to local
      return isPro ? AIProvider.ENJOY : AIProvider.LOCAL

    case AIServiceType.TTS:
      // TTS supports local mode, free users default to local
      return isPro ? AIProvider.ENJOY : AIProvider.LOCAL

    case AIServiceType.ASSESSMENT:
      // Pronunciation assessment doesn't support local mode, must use cloud
      return AIProvider.ENJOY

    default:
      return AIProvider.ENJOY
  }
}

