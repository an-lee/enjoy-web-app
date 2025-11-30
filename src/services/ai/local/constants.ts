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
  {
    value: 'Qwen/Qwen3-1.7B-Instruct',
    label: 'Qwen3 1.7B',
    description:
      'Larger Qwen3 model with better quality. Good balance for most devices. (Non-ONNX)',
    size: '~3.4GB',
    performance: 'medium',
  },
]

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
  serviceType: 'asr' | 'smartTranslation'
): string {
  if (serviceType === 'asr') {
    return DEFAULT_ASR_MODEL
  }
  if (serviceType === 'smartTranslation') {
    return DEFAULT_SMART_TRANSLATION_MODEL
  }
  return ''
}

/**
 * Get model option by value
 */
export function getModelOption(
  serviceType: 'asr' | 'smartTranslation',
  modelValue: string
): ModelOption | undefined {
  let options: ModelOption[]
  if (serviceType === 'asr') {
    options = ASR_MODEL_OPTIONS
  } else {
    options = SMART_TRANSLATION_MODEL_OPTIONS
  }
  return options.find((opt) => opt.value === modelValue)
}

