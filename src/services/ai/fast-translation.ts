/**
 * Fast Translation Service
 * Optimized for speed, used for subtitle translation
 * Uses dedicated translation models (e.g., NLLB, M2M100)
 */

import { apiClient } from '@/lib/api/client'
import { localModelService } from './local'
import type { AIServiceConfig, AIServiceResponse } from './types'

export interface FastTranslationRequest {
  sourceText: string
  sourceLanguage: string
  targetLanguage: string
  config?: AIServiceConfig
}

export interface FastTranslationResponse {
  translatedText: string
  aiModel: string
  tokensUsed?: number
}

/**
 * Fast Translation Service
 * Optimized for speed, used for subtitle translation
 */
export const fastTranslationService = {
  /**
   * Fast translate text (direct translation, no style support)
   */
  async translate(
    request: FastTranslationRequest
  ): Promise<AIServiceResponse<FastTranslationResponse>> {
    const useLocal = request.config?.provider === 'local'

    // Local mode: use transformers.js with dedicated translation models
    if (useLocal) {
      try {
        const result = await localModelService.fastTranslate(
          request.sourceText,
          request.sourceLanguage,
          request.targetLanguage,
          request.config?.localModel
        )
        return {
          success: true,
          data: {
            translatedText: result.translatedText,
            aiModel: 'local-fast-translation',
          },
          metadata: {
            serviceType: 'fastTranslation',
            provider: 'local',
          },
        }
      } catch (error: any) {
        return {
          success: false,
          error: {
            code: 'LOCAL_FAST_TRANSLATION_ERROR',
            message: error.message || 'Local fast translation failed',
          },
          metadata: {
            serviceType: 'fastTranslation',
            provider: 'local',
          },
        }
      }
    }

    // Cloud service
    try {
      const response = await apiClient.post<
        AIServiceResponse<FastTranslationResponse>
      >('/api/v1/services/fast-translation', {
        sourceText: request.sourceText,
        sourceLanguage: request.sourceLanguage,
        targetLanguage: request.targetLanguage,
        config: request.config,
      })

      return response.data
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.response?.data?.error?.code || 'FAST_TRANSLATION_ERROR',
          message: error.response?.data?.error?.message || error.message,
        },
        metadata: {
          serviceType: 'fastTranslation',
          provider: request.config?.provider || 'enjoy',
        },
      }
    }
  },
}

