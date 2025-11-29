/**
 * AI Service Configuration Helper
 * Gets configuration from settings store and converts to AIServiceConfig format
 */

import { useSettingsStore } from '@/stores'
import type { AIServiceConfig } from './types'
import type { AIProvider } from './types'

/**
 * Get AI service configuration from settings
 */
export function getAIServiceConfig(
  service: 'asr' | 'translation' | 'dictionary' | 'tts' | 'assessment'
): AIServiceConfig {
  const { aiServices } = useSettingsStore.getState()
  const serviceSettings = aiServices[service]
  const provider = serviceSettings.defaultProvider

  const config: AIServiceConfig = {
    provider,
  }

  // Add local model configuration if provider is local
  if (provider === 'local' && 'localModel' in serviceSettings && serviceSettings.localModel) {
    config.localModel = {
      model: serviceSettings.localModel,
    }
  }

  return config
}

