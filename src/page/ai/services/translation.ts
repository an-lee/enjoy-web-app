/**
 * Translation Service
 * Basic translation service
 *
 * Provider support:
 * - Enjoy: Uses dedicated translation API (/api/translations) with m2m100 model
 * - Local: Uses LLM for translation
 * - BYOK: Uses LLM for translation
 */

import { translateWithEnjoy } from '../providers/enjoy'
import { localModelService } from '../providers/local'
import { translateWithBYOK } from '../providers/byok'
import type { AIServiceConfig, AIServiceResponse, TranslationResponse } from '../types'
import { AIServiceType, AIProvider } from '../types'
import { ERROR_TRANSLATION_ENJOY } from '../constants'
import {
  createSuccessResponse,
  handleProviderError,
} from '../core/error-handler'
import { routeToProvider } from '../core/provider-router'

export interface TranslationRequest {
  sourceText: string
  sourceLanguage: string
  targetLanguage: string
  config?: AIServiceConfig
  signal?: AbortSignal
}

/**
 * Translation Service
 * Basic translation without style support
 *
 * - Enjoy: Uses dedicated translation API (fast, optimized)
 * - Local/BYOK: Uses LLM for translation
 */
export const translationService = {
  /**
   * Translate text (basic translation without style support)
   */
  async translate(
    request: TranslationRequest
  ): Promise<AIServiceResponse<TranslationResponse>> {
    try {
      const { response, provider } = await routeToProvider<
        TranslationRequest,
        TranslationResponse
      >({
        serviceType: AIServiceType.TRANSLATION,
        request,
        config: request.config,
        handlers: {
          local: async (req, config) => {
            const result = await localModelService.translate(
              req.sourceText,
              req.sourceLanguage,
              req.targetLanguage,
              config?.localModel
            )
            return {
              translatedText: result.translatedText,
              sourceLanguage: result.sourceLanguage || req.sourceLanguage,
              targetLanguage: result.targetLanguage || req.targetLanguage,
            }
          },
          enjoy: async (req) => {
            const result = await translateWithEnjoy(
              req.sourceText,
              req.sourceLanguage,
              req.targetLanguage,
              req.signal
            )
            if (!result.success || !result.data) {
              throw new Error(result.error?.message || 'Enjoy API translation failed')
            }
            return result.data
          },
          byok: async (req, byokConfig) => {
            const result = await translateWithBYOK(
              req.sourceText,
              req.sourceLanguage,
              req.targetLanguage,
              byokConfig,
              req.signal
            )
            if (!result.success || !result.data) {
              throw new Error(result.error?.message || 'BYOK translation failed')
            }
            return result.data
          },
        },
      })

      return createSuccessResponse(
        response,
        AIServiceType.TRANSLATION,
        provider
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

