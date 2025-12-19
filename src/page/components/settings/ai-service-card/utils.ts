import type { ModelType } from '@/page/stores/local-models'
import { AIServiceType } from '@/ai/types'
import {
  ASR_MODEL_OPTIONS,
  SMART_TRANSLATION_MODEL_OPTIONS,
  DICTIONARY_MODEL_OPTIONS,
  TTS_MODEL_OPTIONS,
  getDefaultModel,
  type ModelOption,
} from '@/ai/providers/local/constants'

// Map service types to model types
export const SERVICE_TO_MODEL_TYPE: Partial<Record<AIServiceType, ModelType>> = {
  [AIServiceType.ASR]: 'asr',
  [AIServiceType.SMART_TRANSLATION]: 'smartTranslation',
  [AIServiceType.SMART_DICTIONARY]: 'smartDictionary',
  [AIServiceType.TTS]: 'tts',
}

/**
 * Get available models for a given model type
 */
export function getAvailableModels(modelType: ModelType | null | undefined): ModelOption[] {
  if (!modelType) return []

  switch (modelType) {
    case 'asr':
      return ASR_MODEL_OPTIONS
    case 'smartTranslation':
      return SMART_TRANSLATION_MODEL_OPTIONS
    case 'smartDictionary':
      return DICTIONARY_MODEL_OPTIONS
    case 'tts':
      return TTS_MODEL_OPTIONS
    default:
      return []
  }
}

/**
 * Get current model from service config or default
 */
export function getCurrentModel(
  modelType: ModelType | null | undefined,
  serviceConfig: any
): string {
  if (!modelType) return ''

  const validModelTypes: ModelType[] = ['asr', 'smartTranslation', 'smartDictionary', 'tts']
  if (!validModelTypes.includes(modelType)) return ''

  return serviceConfig?.localModel || getDefaultModel(modelType) || ''
}

/**
 * Format file size in bytes to human-readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes > 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }
  if (bytes > 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`
  }
  return `${bytes} B`
}

/**
 * Extract filename from path
 */
export function extractFileName(path: string): string {
  return path.includes('/') ? path.split('/').pop() || path : path
}

