/**
 * Smart Translation Service
 * Supports pre-defined styles and custom prompts
 * Supports local models (free users) and cloud services
 */

import { apiClient } from '@/lib/api/client'
import { localModelService } from './local-models'
import type { TranslationStyle } from '@/db/schema'
import type { AIServiceConfig, AIServiceResponse } from './types'

export interface TranslationRequest {
  sourceText: string
  sourceLanguage: string
  targetLanguage: string
  style: TranslationStyle
  customPrompt?: string
  config?: AIServiceConfig
}

export interface TranslationResponse {
  translatedText: string
  aiModel: string
  tokensUsed?: number
}

/**
 * Smart Translation Service
 */
export const translationService = {
  /**
   * Translate text
   */
  async translate(
    request: TranslationRequest
  ): Promise<AIServiceResponse<TranslationResponse>> {
    const useLocal = request.config?.provider === 'local'

    // Local mode: use transformers.js
    if (useLocal) {
      try {
        // Note: Local translation models may not support custom style prompts
        // Only basic translation is available
        const result = await localModelService.translate(
          request.sourceText,
          request.sourceLanguage,
          request.targetLanguage,
          request.config?.localModel
        )
        return {
          success: true,
          data: {
            translatedText: result.translatedText,
            aiModel: 'local-transformers',
          },
          metadata: {
            serviceType: 'translation',
            provider: 'local',
          },
        }
      } catch (error: any) {
        return {
          success: false,
          error: {
            code: 'LOCAL_TRANSLATION_ERROR',
            message: error.message || 'Local translation failed',
          },
          metadata: {
            serviceType: 'translation',
            provider: 'local',
          },
        }
      }
    }

    // Cloud service
    try {
      const response = await apiClient.post<
        AIServiceResponse<TranslationResponse>
      >('/api/v1/services/translation', {
        sourceText: request.sourceText,
        sourceLanguage: request.sourceLanguage,
        targetLanguage: request.targetLanguage,
        style: request.style,
        customPrompt: request.customPrompt,
        config: request.config,
      })

      return response.data
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.response?.data?.error?.code || 'TRANSLATION_ERROR',
          message: error.response?.data?.error?.message || error.message,
        },
        metadata: {
          serviceType: 'translation',
          provider: request.config?.provider || 'enjoy',
        },
      }
    }
  },
}

