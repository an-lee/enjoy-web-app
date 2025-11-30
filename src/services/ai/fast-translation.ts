/**
 * Fast Translation Service
 * Free service provided by Enjoy API
 * Uses dedicated translation models (M2M100, NLLB) for speed and low cost
 *
 * Note: This service is ALWAYS free and provided by Enjoy API.
 * No local or BYOK options - use Smart Translation for advanced features.
 */

import { apiClient } from '@/lib/api/client'
import type { AIServiceResponse } from './types'
import type { FastTranslationResponse } from './types-responses'

export interface FastTranslationRequest {
  sourceText: string
  sourceLanguage: string
  targetLanguage: string
}

/**
 * Fast Translation Service
 * Optimized for speed, used for subtitle translation
 * Free service - no configuration needed
 */
export const fastTranslationService = {
  /**
   * Fast translate text (direct translation, no style support)
   * Always uses Enjoy API - no provider selection
   */
  async translate(
    request: FastTranslationRequest
  ): Promise<AIServiceResponse<FastTranslationResponse>> {
    try {
      const response = await apiClient.post<
        AIServiceResponse<FastTranslationResponse>
      >('/api/v1/services/fast-translation', {
        sourceText: request.sourceText,
        sourceLanguage: request.sourceLanguage,
        targetLanguage: request.targetLanguage,
      })

      return response.data
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'FAST_TRANSLATION_ERROR',
          message: error.message || 'Fast translation failed',
        },
        metadata: {
          serviceType: 'fastTranslation',
          provider: 'enjoy',
        },
      }
    }
  },
}
