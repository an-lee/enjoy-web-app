/**
 * Available Local Model Options
 * Defines the models available for each service type
 */

export interface ModelOption {
  value: string // Model identifier (e.g., 'Xenova/whisper-tiny')
  label: string // Display name (e.g., 'Whisper Tiny')
  description?: string // Optional description
  size?: string // Model size indicator (e.g., '~75MB', '~290MB')
  performance?: 'low' | 'medium' | 'high' // Performance requirement
}

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

export const TRANSLATION_MODEL_OPTIONS: ModelOption[] = [
  {
    value: 'onnx-community/Qwen3-0.6B-DQ-ONNX',
    label: 'Qwen3 0.6B DQ (ONNX)',
    description: 'Deep quantized ONNX version of Qwen3 0.6B. Smallest size, optimized for browser. Best for low-end devices.',
    size: '~300MB',
    performance: 'low',
  },
  {
    value: 'onnx-community/Qwen3-0.6B-ONNX',
    label: 'Qwen3 0.6B (ONNX)',
    description: 'ONNX version of Qwen3 0.6B. Standard quantization, slightly larger but better quality.',
    size: '~600MB',
    performance: 'low',
  },
  {
    value: 'Qwen/Qwen3-1.7B-Instruct',
    label: 'Qwen3 1.7B',
    description: 'Larger Qwen3 model with better quality. Good balance for most devices. (Non-ONNX)',
    size: '~3.4GB',
    performance: 'medium',
  },
]

// Get default model for a service type
export function getDefaultModel(serviceType: 'asr' | 'translation'): string {
  if (serviceType === 'asr') {
    return ASR_MODEL_OPTIONS[0].value // whisper-tiny
  }
  if (serviceType === 'translation') {
    return TRANSLATION_MODEL_OPTIONS[0].value // onnx-community/Qwen3-0.6B-DQ-ONNX
  }
  return ''
}

// Get model option by value
export function getModelOption(
  serviceType: 'asr' | 'translation',
  modelValue: string
): ModelOption | undefined {
  const options = serviceType === 'asr' ? ASR_MODEL_OPTIONS : TRANSLATION_MODEL_OPTIONS
  return options.find((opt) => opt.value === modelValue)
}

