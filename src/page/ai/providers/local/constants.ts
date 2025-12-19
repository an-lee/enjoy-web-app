/**
 * Local Model Constants
 * Model configurations and options for local (browser-based) AI services
 */

// ============================================================================
// Default Models
// ============================================================================

/**
 * Default ASR model (Whisper)
 */
export const DEFAULT_ASR_MODEL = 'onnx-community/whisper-tiny_timestamped'

/**
 * Default Smart Translation model (Qwen3)
 */
export const DEFAULT_SMART_TRANSLATION_MODEL = 'onnx-community/Qwen3-0.6B-DQ-ONNX'

/**
 * Default Translation model (legacy, maps to Smart Translation)
 */
export const DEFAULT_TRANSLATION_MODEL = DEFAULT_SMART_TRANSLATION_MODEL

/**
 * Default Dictionary model (uses generative model, same as Smart Translation)
 */
export const DEFAULT_DICTIONARY_MODEL = DEFAULT_SMART_TRANSLATION_MODEL

/**
 * Default TTS model (Kokoro TTS ONNX with timestamps)
 * Uses the timestamped version for word-level alignment
 */
export const DEFAULT_TTS_MODEL = 'onnx-community/Kokoro-82M-v1.0-ONNX-timestamped'

// ============================================================================
// Timeout Configuration
// ============================================================================

/**
 * Model loading timeout (milliseconds)
 */
export const MODEL_LOADING_TIMEOUT = 300000 // 5 minutes

/**
 * Model inference timeout (milliseconds)
 */
export const MODEL_INFERENCE_TIMEOUT = 300000 // 5 minutes

// ============================================================================
// Model Options
// ============================================================================

export interface ModelOption {
  value: string // Model identifier (e.g., 'Xenova/whisper-tiny')
  label: string // Display name (e.g., 'Whisper Tiny')
  description?: string // Optional description
  size?: string // Model size indicator (e.g., '~75MB', '~290MB')
  performance?: 'low' | 'medium' | 'high' // Performance requirement
}

/**
 * Available ASR models (Whisper variants)
 */
export const ASR_MODEL_OPTIONS: ModelOption[] = [
  {
    value: 'onnx-community/whisper-tiny_timestamped',
    label: 'Whisper Tiny (Timestamped)',
    description: 'Fastest, smallest model (~75MB). Good for low-end devices. Word-level timestamps.',
    size: '~75MB',
    performance: 'low',
  },
  {
    value: 'onnx-community/whisper-base_timestamped',
    label: 'Whisper Base (Timestamped)',
    description: 'Balanced model (~145MB). Better accuracy. Word-level timestamps.',
    size: '~145MB',
    performance: 'medium',
  },
  {
    value: 'onnx-community/whisper-small_timestamped',
    label: 'Whisper Small (Timestamped)',
    description: 'Larger model (~483MB). Best accuracy, requires more resources. Word-level timestamps.',
    size: '~483MB',
    performance: 'high',
  },
]

/**
 * Available Smart Translation models (generative models for style support)
 */
export const SMART_TRANSLATION_MODEL_OPTIONS: ModelOption[] = [
  {
    value: 'onnx-community/Qwen3-0.6B-DQ-ONNX',
    label: 'Qwen3 0.6B DQ (ONNX)',
    description:
      'Deep quantized ONNX version of Qwen3 0.6B. Smallest size, optimized for browser. Best for low-end devices.',
    size: '~300MB',
    performance: 'low',
  },
  {
    value: 'onnx-community/Qwen3-0.6B-ONNX',
    label: 'Qwen3 0.6B (ONNX)',
    description:
      'ONNX version of Qwen3 0.6B. Standard quantization, slightly larger but better quality.',
    size: '~600MB',
    performance: 'low',
  },
]

/**
 * Available Dictionary models (uses generative models, same as Smart Translation)
 */
export const DICTIONARY_MODEL_OPTIONS: ModelOption[] = SMART_TRANSLATION_MODEL_OPTIONS

/**
 * Available TTS models (text-to-speech)
 */
export const TTS_MODEL_OPTIONS: ModelOption[] = [
  {
    value: 'onnx-community/Kokoro-82M-v1.0-ONNX-timestamped',
    label: 'Kokoro TTS (ONNX, Timestamped)',
    description:
      'High-quality 82M parameter TTS model with word-level timestamps. Supports multiple voices and accents.',
    size: '~92MB (q8)',
    performance: 'medium',
  },
  {
    value: 'onnx-community/Kokoro-82M-v1.0-ONNX',
    label: 'Kokoro TTS (ONNX)',
    description:
      'High-quality 82M parameter TTS model without timestamps. Slightly faster inference.',
    size: '~92MB (q8)',
    performance: 'medium',
  },
]

// ============================================================================
// TTS Voice Options (per model)
// ============================================================================

export interface LocalVoiceOption {
  value: string
  label: string
  gender?: 'male' | 'female' | 'neutral'
  description?: string
  /**
   * BCP 47 language code (e.g., 'en', 'ja', 'zh', 'es', 'fr', 'pt')
   * This is the primary language the voice supports
   */
  language: string
  /**
   * Voice accent/variant (e.g., 'american', 'british' for English)
   */
  accent?: string
  /**
   * Voice quality grade (A = best, lower = worse)
   */
  grade?: string
}

/**
 * TTS voice options for Kokoro model
 * Voices are categorized by language, nationality, and gender
 * See: https://huggingface.co/hexgrad/Kokoro-82M/tree/main/voices
 *
 * Language support:
 * - en (English): American (a) and British (b) accents
 * - ja (Japanese): jf_*, jm_*
 * - zh (Chinese Mandarin): zf_*, zm_*
 * - es (Spanish): ef_*, em_*
 * - fr (French): ff_*
 * - pt (Portuguese/Brazilian): pf_*, pm_*
 *
 * NOT supported by Kokoro:
 * - ko (Korean)
 * - de (German)
 */
export const KOKORO_TTS_VOICES: LocalVoiceOption[] = [
  // ============================================================================
  // English - American Female (af_*)
  // ============================================================================
  {
    value: 'af_heart',
    label: 'Heart (American Female)',
    gender: 'female',
    language: 'en',
    accent: 'american',
    grade: 'A',
    description: 'Highest quality American female voice',
  },
  {
    value: 'af_bella',
    label: 'Bella (American Female)',
    gender: 'female',
    language: 'en',
    accent: 'american',
    grade: 'A-',
    description: 'High quality American female voice',
  },
  {
    value: 'af_nicole',
    label: 'Nicole (American Female)',
    gender: 'female',
    language: 'en',
    accent: 'american',
    description: 'American female voice',
  },
  {
    value: 'af_nova',
    label: 'Nova (American Female)',
    gender: 'female',
    language: 'en',
    accent: 'american',
    description: 'American female voice',
  },
  {
    value: 'af_sky',
    label: 'Sky (American Female)',
    gender: 'female',
    language: 'en',
    accent: 'american',
    description: 'American female voice',
  },
  {
    value: 'af_sarah',
    label: 'Sarah (American Female)',
    gender: 'female',
    language: 'en',
    accent: 'american',
    description: 'American female voice',
  },
  {
    value: 'af_river',
    label: 'River (American Female)',
    gender: 'female',
    language: 'en',
    accent: 'american',
    description: 'American female voice',
  },
  {
    value: 'af_jessica',
    label: 'Jessica (American Female)',
    gender: 'female',
    language: 'en',
    accent: 'american',
    description: 'American female voice',
  },
  {
    value: 'af_alloy',
    label: 'Alloy (American Female)',
    gender: 'female',
    language: 'en',
    accent: 'american',
    description: 'American female voice',
  },
  {
    value: 'af_aoede',
    label: 'Aoede (American Female)',
    gender: 'female',
    language: 'en',
    accent: 'american',
    description: 'American female voice',
  },
  {
    value: 'af_kore',
    label: 'Kore (American Female)',
    gender: 'female',
    language: 'en',
    accent: 'american',
    description: 'American female voice',
  },

  // ============================================================================
  // English - American Male (am_*)
  // ============================================================================
  {
    value: 'am_michael',
    label: 'Michael (American Male)',
    gender: 'male',
    language: 'en',
    accent: 'american',
    grade: 'C+',
    description: 'American male voice',
  },
  {
    value: 'am_fenrir',
    label: 'Fenrir (American Male)',
    gender: 'male',
    language: 'en',
    accent: 'american',
    grade: 'C+',
    description: 'American male voice',
  },
  {
    value: 'am_puck',
    label: 'Puck (American Male)',
    gender: 'male',
    language: 'en',
    accent: 'american',
    grade: 'C+',
    description: 'American male voice',
  },
  {
    value: 'am_adam',
    label: 'Adam (American Male)',
    gender: 'male',
    language: 'en',
    accent: 'american',
    description: 'American male voice',
  },
  {
    value: 'am_echo',
    label: 'Echo (American Male)',
    gender: 'male',
    language: 'en',
    accent: 'american',
    description: 'American male voice',
  },
  {
    value: 'am_eric',
    label: 'Eric (American Male)',
    gender: 'male',
    language: 'en',
    accent: 'american',
    description: 'American male voice',
  },
  {
    value: 'am_liam',
    label: 'Liam (American Male)',
    gender: 'male',
    language: 'en',
    accent: 'american',
    description: 'American male voice',
  },
  {
    value: 'am_onyx',
    label: 'Onyx (American Male)',
    gender: 'male',
    language: 'en',
    accent: 'american',
    description: 'American male voice',
  },
  {
    value: 'am_santa',
    label: 'Santa (American Male)',
    gender: 'male',
    language: 'en',
    accent: 'american',
    description: 'American male voice (Santa)',
  },

  // ============================================================================
  // English - British Female (bf_*)
  // ============================================================================
  {
    value: 'bf_emma',
    label: 'Emma (British Female)',
    gender: 'female',
    language: 'en',
    accent: 'british',
    grade: 'B-',
    description: 'Best British female voice',
  },
  {
    value: 'bf_isabella',
    label: 'Isabella (British Female)',
    gender: 'female',
    language: 'en',
    accent: 'british',
    description: 'British female voice',
  },
  {
    value: 'bf_alice',
    label: 'Alice (British Female)',
    gender: 'female',
    language: 'en',
    accent: 'british',
    description: 'British female voice',
  },
  {
    value: 'bf_lily',
    label: 'Lily (British Female)',
    gender: 'female',
    language: 'en',
    accent: 'british',
    description: 'British female voice',
  },

  // ============================================================================
  // English - British Male (bm_*)
  // ============================================================================
  {
    value: 'bm_george',
    label: 'George (British Male)',
    gender: 'male',
    language: 'en',
    accent: 'british',
    grade: 'C',
    description: 'British male voice',
  },
  {
    value: 'bm_fable',
    label: 'Fable (British Male)',
    gender: 'male',
    language: 'en',
    accent: 'british',
    grade: 'C',
    description: 'British male voice',
  },
  {
    value: 'bm_daniel',
    label: 'Daniel (British Male)',
    gender: 'male',
    language: 'en',
    accent: 'british',
    description: 'British male voice',
  },
  {
    value: 'bm_lewis',
    label: 'Lewis (British Male)',
    gender: 'male',
    language: 'en',
    accent: 'british',
    description: 'British male voice',
  },

  // ============================================================================
  // Japanese (ja) - Female (jf_*)
  // ============================================================================
  {
    value: 'jf_alpha',
    label: 'Alpha (Japanese Female)',
    gender: 'female',
    language: 'ja',
    description: 'Japanese female voice',
  },
  {
    value: 'jf_gongitsune',
    label: 'Gongitsune (Japanese Female)',
    gender: 'female',
    language: 'ja',
    description: 'Japanese female voice',
  },
  {
    value: 'jf_nezumi',
    label: 'Nezumi (Japanese Female)',
    gender: 'female',
    language: 'ja',
    description: 'Japanese female voice',
  },
  {
    value: 'jf_tebukuro',
    label: 'Tebukuro (Japanese Female)',
    gender: 'female',
    language: 'ja',
    description: 'Japanese female voice',
  },

  // ============================================================================
  // Japanese (ja) - Male (jm_*)
  // ============================================================================
  {
    value: 'jm_kumo',
    label: 'Kumo (Japanese Male)',
    gender: 'male',
    language: 'ja',
    description: 'Japanese male voice',
  },

  // ============================================================================
  // Chinese Mandarin (zh) - Female (zf_*)
  // ============================================================================
  {
    value: 'zf_xiaobei',
    label: 'Xiaobei (Chinese Female)',
    gender: 'female',
    language: 'zh',
    description: 'Chinese Mandarin female voice',
  },
  {
    value: 'zf_xiaoni',
    label: 'Xiaoni (Chinese Female)',
    gender: 'female',
    language: 'zh',
    description: 'Chinese Mandarin female voice',
  },
  {
    value: 'zf_xiaoxiao',
    label: 'Xiaoxiao (Chinese Female)',
    gender: 'female',
    language: 'zh',
    description: 'Chinese Mandarin female voice',
  },
  {
    value: 'zf_xiaoyi',
    label: 'Xiaoyi (Chinese Female)',
    gender: 'female',
    language: 'zh',
    description: 'Chinese Mandarin female voice',
  },

  // ============================================================================
  // Chinese Mandarin (zh) - Male (zm_*)
  // ============================================================================
  {
    value: 'zm_yunjian',
    label: 'Yunjian (Chinese Male)',
    gender: 'male',
    language: 'zh',
    description: 'Chinese Mandarin male voice',
  },
  {
    value: 'zm_yunxi',
    label: 'Yunxi (Chinese Male)',
    gender: 'male',
    language: 'zh',
    description: 'Chinese Mandarin male voice',
  },
  {
    value: 'zm_yunxia',
    label: 'Yunxia (Chinese Male)',
    gender: 'male',
    language: 'zh',
    description: 'Chinese Mandarin male voice',
  },
  {
    value: 'zm_yunyang',
    label: 'Yunyang (Chinese Male)',
    gender: 'male',
    language: 'zh',
    description: 'Chinese Mandarin male voice',
  },

  // ============================================================================
  // Spanish (es) - Female (ef_*)
  // ============================================================================
  {
    value: 'ef_dora',
    label: 'Dora (Spanish Female)',
    gender: 'female',
    language: 'es',
    description: 'Spanish female voice',
  },

  // ============================================================================
  // Spanish (es) - Male (em_*)
  // ============================================================================
  {
    value: 'em_alex',
    label: 'Alex (Spanish Male)',
    gender: 'male',
    language: 'es',
    description: 'Spanish male voice',
  },
  {
    value: 'em_santa',
    label: 'Santa (Spanish Male)',
    gender: 'male',
    language: 'es',
    description: 'Spanish male voice (Santa)',
  },

  // ============================================================================
  // French (fr) - Female (ff_*)
  // ============================================================================
  {
    value: 'ff_siwis',
    label: 'Siwis (French Female)',
    gender: 'female',
    language: 'fr',
    description: 'French female voice',
  },

  // ============================================================================
  // Portuguese/Brazilian (pt) - Female (pf_*)
  // ============================================================================
  {
    value: 'pf_dora',
    label: 'Dora (Portuguese Female)',
    gender: 'female',
    language: 'pt',
    description: 'Brazilian Portuguese female voice',
  },

  // ============================================================================
  // Portuguese/Brazilian (pt) - Male (pm_*)
  // ============================================================================
  {
    value: 'pm_alex',
    label: 'Alex (Portuguese Male)',
    gender: 'male',
    language: 'pt',
    description: 'Brazilian Portuguese male voice',
  },
  {
    value: 'pm_santa',
    label: 'Santa (Portuguese Male)',
    gender: 'male',
    language: 'pt',
    description: 'Brazilian Portuguese male voice (Santa)',
  },
]

/**
 * Supported languages by Kokoro TTS
 * Note: Korean (ko) and German (de) are NOT supported
 */
export const KOKORO_SUPPORTED_LANGUAGES = ['en', 'ja', 'zh', 'es', 'fr', 'pt'] as const
export type KokoroSupportedLanguage = (typeof KOKORO_SUPPORTED_LANGUAGES)[number]

/**
 * Legacy: Supertonic TTS voices (kept for backward compatibility)
 * Note: Supertonic is language-agnostic, so we mark it as 'en' but it works for any language
 */
export const SUPERTONIC_TTS_VOICES: LocalVoiceOption[] = [
  {
    value: 'F1',
    label: 'Female 1',
    gender: 'female',
    language: 'en',
    description: 'Female voice option 1 (multilingual)',
  },
  {
    value: 'F2',
    label: 'Female 2',
    gender: 'female',
    language: 'en',
    description: 'Female voice option 2 (multilingual)',
  },
  {
    value: 'M1',
    label: 'Male 1',
    gender: 'male',
    language: 'en',
    description: 'Male voice option 1 (multilingual)',
  },
  {
    value: 'M2',
    label: 'Male 2',
    gender: 'male',
    language: 'en',
    description: 'Male voice option 2 (multilingual)',
  },
]

/**
 * Get available TTS voices for a given model
 * @param model - The TTS model identifier
 * @param language - Optional BCP 47 language code to filter voices
 * @returns Array of voice options for the model
 */
export function getLocalTTSVoices(
  model?: string,
  language?: string
): LocalVoiceOption[] {
  let voices: LocalVoiceOption[]

  // Kokoro models use Kokoro voices
  if (model?.includes('Kokoro') || !model || model === DEFAULT_TTS_MODEL) {
    voices = KOKORO_TTS_VOICES
  } else if (model?.includes('Supertonic')) {
    // Legacy Supertonic support
    voices = SUPERTONIC_TTS_VOICES
  } else {
    voices = KOKORO_TTS_VOICES // fallback to Kokoro
  }

  // Filter by language if specified
  if (language) {
    // Normalize language code (e.g., 'en-US' -> 'en')
    const normalizedLang = language.split('-')[0].toLowerCase()
    const filtered = voices.filter((v) => v.language === normalizedLang)
    // Return filtered voices if any match, otherwise return all voices
    // (allows fallback to English voices for unsupported languages)
    if (filtered.length > 0) {
      return filtered
    }
  }

  return voices
}

/**
 * Get default TTS voice for a given model and language
 * @param model - The TTS model identifier
 * @param language - Optional BCP 47 language code
 * @returns Default voice value
 */
export function getDefaultLocalTTSVoice(
  model?: string,
  language?: string
): string {
  const voices = getLocalTTSVoices(model, language)
  // Default to best quality voice for the language (or af_heart as fallback)
  return voices[0]?.value || 'af_heart'
}

/**
 * Check if a language is supported by Kokoro TTS
 * @param language - BCP 47 language code
 * @returns true if the language is supported
 */
export function isKokoroLanguageSupported(language: string): boolean {
  const normalizedLang = language.split('-')[0].toLowerCase()
  return (KOKORO_SUPPORTED_LANGUAGES as readonly string[]).includes(
    normalizedLang
  )
}

/**
 * Legacy: Keep for backward compatibility
 */
export const TRANSLATION_MODEL_OPTIONS = SMART_TRANSLATION_MODEL_OPTIONS

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get default model for a service type
 */
export function getDefaultModel(
  serviceType: 'asr' | 'smartTranslation' | 'smartDictionary' | 'tts'
): string {
  if (serviceType === 'asr') {
    return DEFAULT_ASR_MODEL
  }
  if (serviceType === 'smartTranslation') {
    return DEFAULT_SMART_TRANSLATION_MODEL
  }
  if (serviceType === 'smartDictionary') {
    return DEFAULT_DICTIONARY_MODEL
  }
  if (serviceType === 'tts') {
    return DEFAULT_TTS_MODEL
  }
  return ''
}

/**
 * Get model option by value
 */
export function getModelOption(
  serviceType: 'asr' | 'smartTranslation' | 'smartDictionary' | 'tts',
  modelValue: string
): ModelOption | undefined {
  let options: ModelOption[]
  if (serviceType === 'asr') {
    options = ASR_MODEL_OPTIONS
  } else if (serviceType === 'smartDictionary') {
    options = DICTIONARY_MODEL_OPTIONS
  } else if (serviceType === 'tts') {
    options = TTS_MODEL_OPTIONS
  } else {
    options = SMART_TRANSLATION_MODEL_OPTIONS
  }
  return options.find((opt) => opt.value === modelValue)
}

