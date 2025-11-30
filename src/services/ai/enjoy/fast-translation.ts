/**
 * Enjoy API Fast Translation Service
 * Special handling - uses dedicated translation models, not OpenAI
 * Direct API call to Enjoy backend
 */

import { apiClient } from '@/lib/api/client'
import type { AIServiceResponse } from '../types'
import type { FastTranslationResponse } from '../types-responses'

/**
 * Fast Translation with Enjoy API
 * Uses dedicated translation models (M2M100, NLLB) via Enjoy backend
 * This is NOT OpenAI-compatible - it's a custom Enjoy API endpoint
 */
export async function fastTranslateWithEnjoy(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<AIServiceResponse<FastTranslationResponse>> {
  try {
    const response = await apiClient.post<AIServiceResponse<FastTranslationResponse>>(
      '/api/v1/services/fast-translation',
      {
        sourceText: text,
        sourceLanguage,
        targetLanguage,
      }
    )

    return response.data
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: 'ENJOY_FAST_TRANSLATION_ERROR',
        message: error.message || 'Enjoy API fast translation failed',
      },
      metadata: {
        serviceType: 'fastTranslation',
        provider: 'enjoy',
      },
    }
  }
}

