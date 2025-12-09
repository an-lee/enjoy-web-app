/**
 * Translation API Service
 * Free service provided by Enjoy API
 * Uses dedicated translation models (M2M100, NLLB) for speed and low cost
 *
 * Note: This is a regular API service, not an AI service.
 * It's always free and doesn't require AI configuration.
 */

import { apiClient } from '@/api/client'

export interface FastTranslationRequest {
  sourceText: string
  sourceLanguage: string
  targetLanguage: string
}

export interface FastTranslationResponse {
  translatedText: string
  sourceLanguage: string
  targetLanguage: string
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
}

/**
 * Fast Translation API Service
 * Optimized for speed, used for subtitle translation
 * Free service - no configuration needed
 */
export const translationApi = {
  /**
   * Fast translate text (direct translation, no style support)
   * Always uses Enjoy API - no provider selection
   */
  async translate(
    request: FastTranslationRequest
  ): Promise<ApiResponse<FastTranslationResponse>> {
    try {
      const response = await apiClient.post<ApiResponse<FastTranslationResponse>>(
        '/api/v1/services/fast-translation',
        {
          sourceText: request.sourceText,
          sourceLanguage: request.sourceLanguage,
          targetLanguage: request.targetLanguage,
        }
      )

      return response.data
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'TRANSLATION_ERROR',
          message: error.message || 'Fast translation failed',
        },
      }
    }
  },
}

