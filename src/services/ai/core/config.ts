/**
 * AI Service Configuration Management
 * Unified configuration helper that combines config-helper and provider-selector
 */

import { useSettingsStore } from '@/stores'
import { useAuthStore } from '@/stores/auth'
import type { AIServiceConfig, AIProvider, AIServiceType } from '../types'
import { AIProvider as AIProviderEnum, AIServiceType as AIServiceTypeEnum } from '../types'

/**
 * Get AI service configuration from settings
 */
export function getAIServiceConfig(
  service: 'asr' | 'smartTranslation' | 'dictionary' | 'tts' | 'assessment'
): AIServiceConfig {
  const { aiServices } = useSettingsStore.getState()
  const serviceSettings = aiServices[service]

  // Default to 'enjoy' provider if service settings don't exist
  const provider: AIProvider =
    serviceSettings?.defaultProvider || AIProviderEnum.ENJOY

  const config: AIServiceConfig = {
    provider,
  }

  // Add local model configuration if provider is local
  if (
    provider === AIProviderEnum.LOCAL &&
    serviceSettings &&
    'localModel' in serviceSettings &&
    serviceSettings.localModel
  ) {
    config.localModel = {
      model: serviceSettings.localModel,
    }
  }

  return config
}

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
    case AIServiceTypeEnum.ASR:
    case AIServiceTypeEnum.SMART_TRANSLATION:
      // ASR and smart translation support local mode, free users default to local
      return isPro ? AIProviderEnum.ENJOY : AIProviderEnum.LOCAL

    case AIServiceTypeEnum.DICTIONARY:
      // Dictionary lookup supports local mode, free users default to local
      return isPro ? AIProviderEnum.ENJOY : AIProviderEnum.LOCAL

    case AIServiceTypeEnum.TTS:
      // TTS supports local mode, free users default to local
      return isPro ? AIProviderEnum.ENJOY : AIProviderEnum.LOCAL

    case AIServiceTypeEnum.ASSESSMENT:
      // Pronunciation assessment doesn't support local mode, must use cloud
      return AIProviderEnum.ENJOY

    default:
      return AIProviderEnum.ENJOY
  }
}

/**
 * Merge user configuration with defaults
 */
export function mergeAIServiceConfig(
  userConfig?: AIServiceConfig,
  serviceType?: AIServiceType
): AIServiceConfig {
  const selectedProvider = selectProvider(
    userConfig?.provider,
    serviceType
  )

  return {
    ...userConfig,
    provider: selectedProvider,
  }
}

