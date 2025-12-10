/**
 * TTS Voice Utilities
 * Unified interface for accessing TTS voices across all providers
 *
 * Voice definitions are co-located with their providers:
 * - Local: src/ai/providers/local/constants.ts (model-specific voices)
 * - Enjoy: src/ai/providers/enjoy/azure/voices.ts (Azure Neural Voices)
 * - BYOK: src/ai/providers/byok/voices.ts (OpenAI + Azure voices)
 *
 * This module provides a unified interface for the UI to access voices
 * regardless of provider.
 */

import { AIProvider, BYOKProvider } from '../types'
import {
  getLocalTTSVoices,
  getDefaultLocalTTSVoice,
  type LocalVoiceOption,
} from '../providers/local/constants'
import {
  getAzureTTSVoices,
  getDefaultAzureTTSVoice,
  type VoiceOption as EnjoyVoiceOption,
} from '../providers/enjoy/azure/voices'
import {
  getBYOKTTSVoices,
  getDefaultBYOKTTSVoice,
  type VoiceOption as BYOKVoiceOption,
} from '../providers/byok/voices'

// Re-export VoiceOption type for convenience
export type VoiceOption = LocalVoiceOption | EnjoyVoiceOption | BYOKVoiceOption

/**
 * Get available voices for a provider, optionally filtered by language
 *
 * @param provider - The AI provider (LOCAL, ENJOY, BYOK)
 * @param byokProvider - The BYOK provider (if using BYOK)
 * @param language - Optional language code to filter voices (e.g., 'en', 'zh', 'ja')
 * @returns Array of voice options matching the criteria
 */
export function getTTSVoices(
  provider: AIProvider,
  byokProvider?: BYOKProvider,
  language?: string
): VoiceOption[] {
  switch (provider) {
    case AIProvider.LOCAL:
      return getLocalTTSVoices(undefined, language)

    case AIProvider.ENJOY:
      return getAzureTTSVoices(language)

    case AIProvider.BYOK:
      return getBYOKTTSVoices(byokProvider, language)

    default:
      // Fallback to Enjoy (Azure) voices
      return getAzureTTSVoices(language)
  }
}

/**
 * Get default voice for a provider, optionally filtered by language
 *
 * @param provider - The AI provider (LOCAL, ENJOY, BYOK)
 * @param byokProvider - The BYOK provider (if using BYOK)
 * @param language - Optional language code to filter voices
 * @returns The default voice value for the provider and language
 */
export function getDefaultTTSVoice(
  provider: AIProvider,
  byokProvider?: BYOKProvider,
  language?: string
): string {
  switch (provider) {
    case AIProvider.LOCAL:
      return getDefaultLocalTTSVoice(undefined, language)

    case AIProvider.ENJOY:
      return getDefaultAzureTTSVoice(language)

    case AIProvider.BYOK:
      return getDefaultBYOKTTSVoice(byokProvider, language)

    default:
      return getDefaultAzureTTSVoice(language)
  }
}
