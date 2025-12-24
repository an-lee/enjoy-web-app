/**
 * Translation Service
 * Basic translation using Enjoy AI (free service)
 * Uses fast translation models (M2M100, NLLB) for speed and low cost
 */

import { translateWithEnjoy } from '../providers/enjoy'
import type { AIServiceResponse, TranslationResponse } from '../types'
import { AIServiceType, AIProvider } from '../types'
import { ERROR_TRANSLATION_ENJOY } from '../constants'
import {
  createSuccessResponse,
  handleProviderError,
} from '../core/error-handler'

export interface TranslationRequest {
  sourceText: string
  sourceLanguage: string
  targetLanguage: string
  signal?: AbortSignal
}

/**
 * Translation Service
 * Free service provided by Enjoy AI
 * No provider selection - always uses Enjoy API
 */
export const translationService = {
  /**
   * Translate text (basic translation without style support)
   * Always uses Enjoy API
   */
  async translate(
    request: TranslationRequest
  ): Promise<AIServiceResponse<TranslationResponse>> {
    try {
      const result = await translateWithEnjoy(
        request.sourceText,
        request.sourceLanguage,
        request.targetLanguage,
        request.signal
      )

      if (!result.success || !result.data) {
        throw new Error(result.error?.message || 'Translation failed')
      }

      return createSuccessResponse(
        result.data,
        AIServiceType.TRANSLATION,
        AIProvider.ENJOY
      )
    } catch (error) {
      return handleProviderError(
        error,
        ERROR_TRANSLATION_ENJOY,
        AIServiceType.TRANSLATION,
        AIProvider.ENJOY
      )
    }
  },
}

