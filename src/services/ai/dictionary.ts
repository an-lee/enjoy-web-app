/**
 * Dictionary Lookup Service
 * Uses generative AI to generate dictionary content
 * Supports local models (may have limited capabilities)
 */

import { apiClient } from '@/lib/api/client'
import { localModelService } from './local-models'
import type { AIServiceConfig, AIServiceResponse } from './types'

export interface DictionaryRequest {
  word: string
  context?: string
  sourceLanguage: string
  targetLanguage: string
  config?: AIServiceConfig
}

export interface DictionaryResponse {
  word: string
  definitions: Array<{
    partOfSpeech: string
    definition: string
    translation: string
    example?: string
  }>
  contextualExplanation?: string
  etymology?: string
}

/**
 * Dictionary Lookup Service
 */
export const dictionaryService = {
  /**
   * Lookup word
   */
  async lookup(
    request: DictionaryRequest
  ): Promise<AIServiceResponse<DictionaryResponse>> {
    const useLocal = request.config?.provider === 'local'

    // Local mode: use transformers.js (if supported)
    // Note: Dictionary lookup may require larger models, may not be suitable for local execution
    if (useLocal) {
      try {
        const result = await localModelService.lookup(
          request.word,
          request.context,
          request.sourceLanguage,
          request.targetLanguage,
          request.config?.localModel
        )
        return {
          success: true,
          data: result,
          metadata: {
            serviceType: 'dictionary',
            provider: 'local',
          },
        }
      } catch (error: any) {
        // If local model doesn't support, can fallback to cloud service
        // Or return error prompting user to use cloud service
        return {
          success: false,
          error: {
            code: 'LOCAL_DICTIONARY_NOT_SUPPORTED',
            message: 'Dictionary lookup is not supported in local mode. Please use cloud service.',
          },
          metadata: {
            serviceType: 'dictionary',
            provider: 'local',
          },
        }
      }
    }

    // Cloud service
    try {
      const response = await apiClient.post<
        AIServiceResponse<DictionaryResponse>
      >('/api/v1/services/dictionary', {
        word: request.word,
        context: request.context,
        sourceLanguage: request.sourceLanguage,
        targetLanguage: request.targetLanguage,
        config: request.config,
      })

      return response.data
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.response?.data?.error?.code || 'DICTIONARY_ERROR',
          message: error.response?.data?.error?.message || error.message,
        },
        metadata: {
          serviceType: 'dictionary',
          provider: request.config?.provider || 'enjoy',
        },
      }
    }
  },
}

