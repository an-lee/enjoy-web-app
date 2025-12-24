/**
 * Dictionary Service
 * AI-powered dictionary lookup with context-aware word explanations
 *
 * Provider support:
 * - Enjoy: Uses dedicated dictionary API (/api/dictionary/query) - ONLY provider
 * - Local: NOT SUPPORTED
 * - BYOK: NOT SUPPORTED
 *
 * Note: Dictionary service is only available through Enjoy API.
 * For basic dictionary lookup (FREE), use @/services/api/dictionary
 */

import { dictionaryLookupWithEnjoy } from '../providers/enjoy'
import type {
  AIServiceResponse,
  DictionaryResponse,
} from '../types'
import { AIServiceType, AIProvider } from '../types'
import { ERROR_SMART_DICTIONARY_LOCAL_NOT_SUPPORTED } from '../constants'
import {
  createSuccessResponse,
  handleProviderError,
} from '../core/error-handler'

export interface DictionaryRequest {
  word: string
  context?: string
  sourceLanguage: string
  targetLanguage: string
}

/**
 * Dictionary Service
 * Provides context-aware word explanations using AI
 * Only available through Enjoy API
 */
export const dictionaryService = {
  /**
   * Contextual word lookup with AI explanation
   * Only supports Enjoy API provider
   */
  async lookup(
    request: DictionaryRequest
  ): Promise<AIServiceResponse<DictionaryResponse>> {
    try {
      // Dictionary service only supports Enjoy API
      const result = await dictionaryLookupWithEnjoy(
        request.word,
        request.context,
        request.sourceLanguage,
        request.targetLanguage
      )

      if (!result.success || !result.data) {
        throw new Error(result.error?.message || 'Enjoy API dictionary lookup failed')
      }

      return createSuccessResponse(
        result.data,
        AIServiceType.DICTIONARY,
        AIProvider.ENJOY
      )
    } catch (error) {
      return handleProviderError(
        error,
        ERROR_SMART_DICTIONARY_LOCAL_NOT_SUPPORTED,
        AIServiceType.DICTIONARY,
        AIProvider.ENJOY
      )
    }
  },
}

