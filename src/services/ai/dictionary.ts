/**
 * Dictionary Lookup Service
 * Uses generative AI to generate dictionary content
 * Supports local models (may have limited capabilities)
 */

import { localModelService } from './local'
import { dictionaryLookupWithBYOK } from './byok'
import { dictionaryLookupWithEnjoy } from './enjoy'
import type { AIServiceConfig, AIServiceResponse } from './types'
import type { DictionaryResponse } from './types-responses'

export interface DictionaryRequest {
  word: string
  context?: string
  sourceLanguage: string
  targetLanguage: string
  config?: AIServiceConfig
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
    const useBYOK = request.config?.provider === 'byok'

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
            message:
              'Dictionary lookup is not supported in local mode. Please use cloud service.',
          },
          metadata: {
            serviceType: 'dictionary',
            provider: 'local',
          },
        }
      }
    }

    // BYOK mode: use user's own API keys with Vercel AI SDK
    if (useBYOK && request.config?.byok) {
      return dictionaryLookupWithBYOK(
        request.word,
        request.context,
        request.sourceLanguage,
        request.targetLanguage,
        request.config.byok
      )
    }

    // Enjoy API (cloud service)
    return dictionaryLookupWithEnjoy(
      request.word,
      request.context,
      request.sourceLanguage,
      request.targetLanguage
    )
  },
}

