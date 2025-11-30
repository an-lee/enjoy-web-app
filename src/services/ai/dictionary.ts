/**
 * Dictionary Contextual Lookup Service
 * Uses AI (LLM) for context-aware word explanations
 *
 * Note: Basic dictionary lookup (without AI) is available as a regular API service.
 * This service only handles contextual explanations that require AI.
 */

import { localModelService } from './local'
import { dictionaryLookupWithBYOK } from './byok'
import { dictionaryLookupWithEnjoy } from './enjoy'
import type { AIServiceConfig, AIServiceResponse } from './types'
import type { DictionaryResponse } from './types-responses'
import {
  ERROR_DICTIONARY_LOCAL_NOT_SUPPORTED,
  SERVICE_TYPES,
  AI_PROVIDERS,
  getErrorMessage,
} from './constants'

export interface DictionaryRequest {
  word: string
  context?: string
  sourceLanguage: string
  targetLanguage: string
  config?: AIServiceConfig
}

/**
 * Dictionary Contextual Lookup Service
 * Provides context-aware word explanations using AI
 */
export const dictionaryService = {
  /**
   * Contextual word lookup with AI explanation
   * Requires AI configuration (enjoy/local/byok)
   * Provides: context-aware meanings, usage examples, detailed explanations
   */
  async lookup(
    request: DictionaryRequest
  ): Promise<AIServiceResponse<DictionaryResponse>> {
    const useLocal = request.config?.provider === AI_PROVIDERS.LOCAL
    const useBYOK = request.config?.provider === AI_PROVIDERS.BYOK

    // Local mode: use transformers.js (if supported)
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
            serviceType: SERVICE_TYPES.DICTIONARY,
            provider: AI_PROVIDERS.LOCAL,
          },
        }
      } catch (error: any) {
        return {
          success: false,
          error: {
            code: ERROR_DICTIONARY_LOCAL_NOT_SUPPORTED,
            message: getErrorMessage(ERROR_DICTIONARY_LOCAL_NOT_SUPPORTED),
          },
          metadata: {
            serviceType: SERVICE_TYPES.DICTIONARY,
            provider: AI_PROVIDERS.LOCAL,
          },
        }
      }
    }

    // BYOK mode: use user's own API keys with Vercel AI SDK (FUTURE)
    if (useBYOK && request.config?.byok) {
      return dictionaryLookupWithBYOK(
        request.word,
        request.context,
        request.sourceLanguage,
        request.targetLanguage,
        request.config.byok
      )
    }

    // Enjoy API (cloud service) - contextual explanation with AI (default)
    return dictionaryLookupWithEnjoy(
      request.word,
      request.context,
      request.sourceLanguage,
      request.targetLanguage
    )
  },
}
