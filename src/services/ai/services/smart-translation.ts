/**
 * Smart Translation Service
 * Style-aware translation using LLM with unified prompts
 */

import { localModelService } from '../providers/local'
import { smartTranslateWithBYOK } from '../providers/byok'
import { smartTranslateWithEnjoy } from '../providers/enjoy'
import { DEFAULT_SMART_TRANSLATION_MODEL } from '../providers/local/constants'
import type { TranslationStyle } from '@/db/schema'
import type {
  AIServiceConfig,
  AIServiceResponse,
  SmartTranslationResponse,
} from '../types'
import { AIServiceType, AIProvider } from '../types'
import { ERROR_SMART_TRANSLATION_LOCAL } from '../constants'
import {
  createSuccessResponse,
  handleProviderError,
} from '../core/error-handler'
import { routeToProvider } from '../core/provider-router'

export interface SmartTranslationRequest {
  sourceText: string
  sourceLanguage: string
  targetLanguage: string
  style: TranslationStyle
  customPrompt?: string
  config?: AIServiceConfig
}

/**
 * Smart Translation Service
 * Supports style-based translation with custom prompts
 */
export const smartTranslationService = {
  /**
   * Smart translate text with style support
   */
  async translate(
    request: SmartTranslationRequest
  ): Promise<AIServiceResponse<SmartTranslationResponse>> {
    try {
      const { response, provider } = await routeToProvider<
        SmartTranslationRequest,
        SmartTranslationResponse
      >({
        serviceType: AIServiceType.SMART_TRANSLATION,
        request,
        config: request.config,
        handlers: {
          local: async (req, config) => {
            const modelName =
              config?.localModel?.model || DEFAULT_SMART_TRANSLATION_MODEL
            const result = await localModelService.smartTranslate(
              req.sourceText,
              req.sourceLanguage,
              req.targetLanguage,
              req.style,
              req.customPrompt,
              config?.localModel
            )
            return {
              translatedText: result.translatedText,
              aiModel: `local/${modelName}`,
            }
          },
          enjoy: async (req) => {
            const result = await smartTranslateWithEnjoy(
              req.sourceText,
              req.sourceLanguage,
              req.targetLanguage,
              req.style,
              req.customPrompt
            )
            if (!result.success || !result.data) {
              throw new Error(result.error?.message || 'Enjoy API translation failed')
            }
            return result.data
          },
          byok: async (req, byokConfig) => {
            const result = await smartTranslateWithBYOK(
              req.sourceText,
              req.sourceLanguage,
              req.targetLanguage,
              req.style,
              req.customPrompt,
              byokConfig
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
        AIServiceType.SMART_TRANSLATION,
        provider
      )
    } catch (error) {
      return handleProviderError(
        error,
        ERROR_SMART_TRANSLATION_LOCAL,
        AIServiceType.SMART_TRANSLATION,
        AIProvider.ENJOY
      )
    }
  },
}
