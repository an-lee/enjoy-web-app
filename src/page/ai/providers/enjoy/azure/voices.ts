/**
 * Azure Neural Voice Options for Enjoy Provider
 * Enjoy uses Azure Speech Services for TTS via token authentication
 *
 * Note: These are the same voices available through Azure Speech Services.
 * The Enjoy provider obtains a token from /api/azure/tokens to access these voices.
 */

export interface VoiceOption {
  value: string
  label: string
  gender?: 'male' | 'female' | 'neutral'
  description?: string
  /**
   * Supported languages for this voice
   * If undefined or empty array, the voice supports all languages
   */
  languages?: string[]
}

/**
 * Azure Neural Voices available through Enjoy API
 * Voice names follow the pattern: {locale}-{name}Neural
 */
export const AZURE_TTS_VOICES: VoiceOption[] = [
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
 * Get available Azure TTS voices, optionally filtered by language
 * @param language - Optional language code to filter voices (e.g., 'en', 'zh', 'ja')
 * @returns Array of voice options
 */
export function getAzureTTSVoices(language?: string): VoiceOption[] {
  if (!language) {
    return AZURE_TTS_VOICES
  }

  return AZURE_TTS_VOICES.filter((voice) => {
    if (!voice.languages || voice.languages.length === 0) {
      return true
    }
    return voice.languages.includes(language)
  })
}

/**
 * Get default Azure TTS voice for a given language
 * @param language - Optional language code
 * @returns Default voice value
 */
export function getDefaultAzureTTSVoice(language?: string): string {
  const voices = getAzureTTSVoices(language)
  return voices[0]?.value || 'en-US-JennyNeural'
}

