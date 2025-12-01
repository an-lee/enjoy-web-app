/**
 * TTS Voice Options Configuration
 * Defines available voices for each TTS provider
 */

import { AIProvider, BYOKProvider } from '../types'

export interface VoiceOption {
  value: string
  label: string
  gender?: 'male' | 'female' | 'neutral'
  description?: string
  /**
   * Supported languages for this voice
   * If undefined or empty array, the voice supports all languages
   * Language codes should match the format used in the app (e.g., 'en', 'zh', 'ja')
   */
  languages?: string[]
}

/**
 * Local TTS voices (Supertonic)
 * Available voices: F1, F2 (Female), M1, M2 (Male)
 * Supertonic supports multiple languages, so we don't restrict by language
 */
export const LOCAL_TTS_VOICES: VoiceOption[] = [
  {
    value: 'F1',
    label: 'Female 1',
    gender: 'female',
    description: 'Female voice option 1',
    // Supertonic voices support multiple languages
  },
  {
    value: 'F2',
    label: 'Female 2',
    gender: 'female',
    description: 'Female voice option 2',
  },
  {
    value: 'M1',
    label: 'Male 1',
    gender: 'male',
    description: 'Male voice option 1',
  },
  {
    value: 'M2',
    label: 'Male 2',
    gender: 'male',
    description: 'Male voice option 2',
  },
]

/**
 * Enjoy API voices (OpenAI TTS)
 * OpenAI TTS supports: alloy, echo, fable, onyx, nova, shimmer
 * OpenAI voices support multiple languages, so we don't restrict by language
 */
export const ENJOY_TTS_VOICES: VoiceOption[] = [
  {
    value: 'alloy',
    label: 'Alloy',
    gender: 'neutral',
    description: 'Neutral voice',
    // OpenAI voices support multiple languages
  },
  {
    value: 'echo',
    label: 'Echo',
    gender: 'male',
    description: 'Male voice',
  },
  {
    value: 'fable',
    label: 'Fable',
    gender: 'neutral',
    description: 'Neutral voice',
  },
  {
    value: 'onyx',
    label: 'Onyx',
    gender: 'male',
    description: 'Male voice',
  },
  {
    value: 'nova',
    label: 'Nova',
    gender: 'female',
    description: 'Female voice',
  },
  {
    value: 'shimmer',
    label: 'Shimmer',
    gender: 'female',
    description: 'Female voice',
  },
]

/**
 * BYOK OpenAI voices (same as Enjoy API)
 */
export const BYOK_OPENAI_TTS_VOICES: VoiceOption[] = ENJOY_TTS_VOICES

/**
 * BYOK Azure voices
 * Azure Speech supports many voices, each voice is language-specific
 * Voice names follow the pattern: {locale}-{name}Neural
 * We extract the language code from the voice name
 */
export const BYOK_AZURE_TTS_VOICES: VoiceOption[] = [
  // English (US)
  {
    value: 'en-US-JennyNeural',
    label: 'Jenny (US, Female)',
    gender: 'female',
    description: 'US English female voice',
    languages: ['en'],
  },
  {
    value: 'en-US-GuyNeural',
    label: 'Guy (US, Male)',
    gender: 'male',
    description: 'US English male voice',
    languages: ['en'],
  },
  {
    value: 'en-US-AriaNeural',
    label: 'Aria (US, Female)',
    gender: 'female',
    description: 'US English female voice',
    languages: ['en'],
  },
  {
    value: 'en-US-DavisNeural',
    label: 'Davis (US, Male)',
    gender: 'male',
    description: 'US English male voice',
    languages: ['en'],
  },
  // English (UK)
  {
    value: 'en-GB-SoniaNeural',
    label: 'Sonia (UK, Female)',
    gender: 'female',
    description: 'UK English female voice',
    languages: ['en'],
  },
  {
    value: 'en-GB-RyanNeural',
    label: 'Ryan (UK, Male)',
    gender: 'male',
    description: 'UK English male voice',
    languages: ['en'],
  },
  // Chinese (Simplified)
  {
    value: 'zh-CN-XiaoxiaoNeural',
    label: 'Xiaoxiao (CN, Female)',
    gender: 'female',
    description: 'Chinese female voice',
    languages: ['zh'],
  },
  {
    value: 'zh-CN-YunxiNeural',
    label: 'Yunxi (CN, Male)',
    gender: 'male',
    description: 'Chinese male voice',
    languages: ['zh'],
  },
  {
    value: 'zh-CN-XiaoyiNeural',
    label: 'Xiaoyi (CN, Female)',
    gender: 'female',
    description: 'Chinese female voice',
    languages: ['zh'],
  },
  {
    value: 'zh-CN-YunjianNeural',
    label: 'Yunjian (CN, Male)',
    gender: 'male',
    description: 'Chinese male voice',
    languages: ['zh'],
  },
  // Japanese
  {
    value: 'ja-JP-NanamiNeural',
    label: 'Nanami (JP, Female)',
    gender: 'female',
    description: 'Japanese female voice',
    languages: ['ja'],
  },
  {
    value: 'ja-JP-KeitaNeural',
    label: 'Keita (JP, Male)',
    gender: 'male',
    description: 'Japanese male voice',
    languages: ['ja'],
  },
  {
    value: 'ja-JP-AoiNeural',
    label: 'Aoi (JP, Female)',
    gender: 'female',
    description: 'Japanese female voice',
    languages: ['ja'],
  },
  {
    value: 'ja-JP-DaichiNeural',
    label: 'Daichi (JP, Male)',
    gender: 'male',
    description: 'Japanese male voice',
    languages: ['ja'],
  },
  // Korean
  {
    value: 'ko-KR-SunHiNeural',
    label: 'SunHi (KR, Female)',
    gender: 'female',
    description: 'Korean female voice',
    languages: ['ko'],
  },
  {
    value: 'ko-KR-InJoonNeural',
    label: 'InJoon (KR, Male)',
    gender: 'male',
    description: 'Korean male voice',
    languages: ['ko'],
  },
  // Spanish
  {
    value: 'es-ES-ElviraNeural',
    label: 'Elvira (ES, Female)',
    gender: 'female',
    description: 'Spanish female voice',
    languages: ['es'],
  },
  {
    value: 'es-ES-AlvaroNeural',
    label: 'Alvaro (ES, Male)',
    gender: 'male',
    description: 'Spanish male voice',
    languages: ['es'],
  },
  // French
  {
    value: 'fr-FR-DeniseNeural',
    label: 'Denise (FR, Female)',
    gender: 'female',
    description: 'French female voice',
    languages: ['fr'],
  },
  {
    value: 'fr-FR-HenriNeural',
    label: 'Henri (FR, Male)',
    gender: 'male',
    description: 'French male voice',
    languages: ['fr'],
  },
  // German
  {
    value: 'de-DE-KatjaNeural',
    label: 'Katja (DE, Female)',
    gender: 'female',
    description: 'German female voice',
    languages: ['de'],
  },
  {
    value: 'de-DE-ConradNeural',
    label: 'Conrad (DE, Male)',
    gender: 'male',
    description: 'German male voice',
    languages: ['de'],
  },
  // Portuguese
  {
    value: 'pt-BR-FranciscaNeural',
    label: 'Francisca (BR, Female)',
    gender: 'female',
    description: 'Portuguese female voice',
    languages: ['pt'],
  },
  {
    value: 'pt-BR-AntonioNeural',
    label: 'Antonio (BR, Male)',
    gender: 'male',
    description: 'Portuguese male voice',
    languages: ['pt'],
  },
]

/**
 * Get available voices for a provider, optionally filtered by language
 * @param provider - The AI provider
 * @param byokProvider - The BYOK provider (if using BYOK)
 * @param language - Optional language code to filter voices (e.g., 'en', 'zh', 'ja')
 *                   If not provided, returns all voices for the provider
 * @returns Array of voice options matching the criteria
 */
export function getTTSVoices(
  provider: AIProvider,
  byokProvider?: BYOKProvider,
  language?: string
): VoiceOption[] {
  let voices: VoiceOption[] = []

  if (provider === AIProvider.LOCAL) {
    voices = LOCAL_TTS_VOICES
  } else if (provider === AIProvider.ENJOY) {
    voices = ENJOY_TTS_VOICES
  } else if (provider === AIProvider.BYOK) {
    if (byokProvider === BYOKProvider.AZURE) {
      voices = BYOK_AZURE_TTS_VOICES
    } else {
      // Default to OpenAI voices for BYOK
      voices = BYOK_OPENAI_TTS_VOICES
    }
  } else {
    // Default fallback
    voices = ENJOY_TTS_VOICES
  }

  // Filter by language if specified
  if (language) {
    voices = voices.filter((voice) => {
      // If voice has no languages specified, it supports all languages
      if (!voice.languages || voice.languages.length === 0) {
        return true
      }
      // Check if the voice supports the requested language
      return voice.languages.includes(language)
    })
  }

  return voices
}

/**
 * Get default voice for a provider, optionally filtered by language
 * @param provider - The AI provider
 * @param byokProvider - The BYOK provider (if using BYOK)
 * @param language - Optional language code to filter voices
 * @returns The default voice value for the provider and language
 */
export function getDefaultTTSVoice(
  provider: AIProvider,
  byokProvider?: BYOKProvider,
  language?: string
): string {
  const voices = getTTSVoices(provider, byokProvider, language)
  return voices[0]?.value || 'alloy'
}

