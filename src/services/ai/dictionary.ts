/**
 * Dictionary Lookup Service
 *
 * Two-tier service:
 * 1. Basic word lookup - FREE via Enjoy API (always available)
 * 2. Contextual explanation - Uses AI (enjoy/local/byok) for deeper analysis
 *
 * Basic lookup provides: word definitions, translations, part of speech
 * Contextual explanation provides: context-aware meaning, usage examples, detailed explanation
 */

import { apiClient } from '@/lib/api/client'
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
   * Basic word lookup (FREE)
   * Always uses Enjoy API - no AI needed
   * Provides: definitions, translations, part of speech
   */
  async lookupBasic(
    word: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<AIServiceResponse<DictionaryResponse>> {
    try {
      const response = await apiClient.post<
        AIServiceResponse<DictionaryResponse>
      >('/api/v1/services/dictionary/basic', {
        word,
        sourceLanguage,
        targetLanguage,
      })

      return response.data
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'DICTIONARY_BASIC_ERROR',
          message: error.message || 'Basic dictionary lookup failed',
        },
        metadata: {
          serviceType: 'dictionary',
          provider: 'enjoy',
        },
      }
    }
  },

  /**
   * Contextual word lookup with AI explanation
   * Requires AI configuration (enjoy/local/byok)
   * Provides: context-aware meanings, usage examples, detailed explanations
   */
  async lookup(
    request: DictionaryRequest
  ): Promise<AIServiceResponse<DictionaryResponse>> {
    const useLocal = request.config?.provider === 'local'
    const useBYOK = request.config?.provider === 'byok'

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
            serviceType: 'dictionary',
            provider: 'local',
          },
        }
      } catch (error: any) {
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

    // Enjoy API (cloud service) - contextual explanation with AI
    return dictionaryLookupWithEnjoy(
      request.word,
      request.context,
      request.sourceLanguage,
      request.targetLanguage
    )
  },
}
