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
export const DEFAULT_ASR_MODEL = 'Xenova/whisper-tiny'

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
 * Default TTS model (Supertonic TTS ONNX)
 */
export const DEFAULT_TTS_MODEL = 'onnx-community/Supertonic-TTS-ONNX'

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
    value: 'Xenova/whisper-tiny',
    label: 'Whisper Tiny',
    description: 'Fastest, smallest model (~75MB). Good for low-end devices.',
    size: '~75MB',
    performance: 'low',
  },
  {
    value: 'Xenova/whisper-small',
    label: 'Whisper Small',
    description: 'Balanced model (~290MB). Better accuracy than Tiny.',
    size: '~290MB',
    performance: 'medium',
  },
  {
    value: 'Xenova/whisper-base',
    label: 'Whisper Base',
    description: 'Larger model (~290MB). Best accuracy, requires more resources.',
    size: '~290MB',
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
    value: 'onnx-community/Supertonic-TTS-ONNX',
    label: 'Supertonic TTS (ONNX)',
    description:
      'ONNX-optimized TTS model for high-quality speech synthesis. Supports multiple languages and voices.',
    size: '~150MB',
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
   * Supported languages for this voice
   * If undefined or empty array, the voice supports all languages
   */
  languages?: string[]
}

/**
 * TTS voice options for Supertonic model
 * Available voices: F1, F2 (Female), M1, M2 (Male)
 * Supertonic supports multiple languages, so we don't restrict by language
 */
export const SUPERTONIC_TTS_VOICES: LocalVoiceOption[] = [
  {
    value: 'F1',
    label: 'Female 1',
    gender: 'female',
    description: 'Female voice option 1',
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
 * Get available TTS voices for a given model
 * @param model - The TTS model identifier
 * @returns Array of voice options for the model
 */
export function getLocalTTSVoices(model?: string): LocalVoiceOption[] {
  // Currently only Supertonic is supported
  // When more models are added, this function will select voices based on model
  if (model === 'onnx-community/Supertonic-TTS-ONNX' || !model) {
    return SUPERTONIC_TTS_VOICES
  }
  return SUPERTONIC_TTS_VOICES // fallback
}

/**
 * Get default TTS voice for a given model
 * @param model - The TTS model identifier
 * @returns Default voice value
 */
export function getDefaultLocalTTSVoice(model?: string): string {
  const voices = getLocalTTSVoices(model)
  return voices[0]?.value || 'F1'
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

