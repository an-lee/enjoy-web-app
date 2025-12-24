/**
 * Contextual Translation Service
 * Context-aware translation using LLM with surrounding text context
 *
 * Provider support:
 * - Enjoy: LLM via /api/chat/completions
 * - Local: Browser-based LLM (transformers.js)
 * - BYOK: User's own LLM API keys
 */

import { localModelService } from '../providers/local'
import { contextualTranslateWithBYOK } from '../providers/byok'
import { contextualTranslateWithEnjoy } from '../providers/enjoy'
import type {
  AIServiceConfig,
  AIServiceResponse,
  ContextualTranslationResponse,
} from '../types'
import { AIServiceType, AIProvider } from '../types'
import { ERROR_SMART_TRANSLATION_LOCAL } from '../constants'
import {
  createSuccessResponse,
  handleProviderError,
} from '../core/error-handler'
import { routeToProvider } from '../core/provider-router'

export interface ContextualTranslationRequest {
  sourceText: string
  sourceLanguage: string
  targetLanguage: string
  context?: string // Surrounding text context
  config?: AIServiceConfig
  signal?: AbortSignal
}

/**
 * Contextual Translation Service
 * Provides context-aware translation using surrounding text
 */
export const contextualTranslationService = {
  /**
   * Translate text with context awareness
   */
  async translate(
    request: ContextualTranslationRequest
  ): Promise<AIServiceResponse<ContextualTranslationResponse>> {
    try {
      const { response, provider } = await routeToProvider<
        ContextualTranslationRequest,
        ContextualTranslationResponse
      >({
        serviceType: AIServiceType.CONTEXTUAL_TRANSLATION,
        request,
        config: request.config,
        handlers: {
          local: async (req, config) => {
            const result = await localModelService.contextualTranslate(
              req.sourceText,
              req.sourceLanguage,
              req.targetLanguage,
              req.context,
              config?.localModel,
              req.signal
            )
            return {
              translatedText: result.translatedText,
              aiModel: `local/${config?.localModel?.model || 'default'}`,
            }
          },
          enjoy: async (req) => {
            const result = await contextualTranslateWithEnjoy(
              req.sourceText,
              req.sourceLanguage,
              req.targetLanguage,
              req.context,
              req.signal
            )
            if (!result.success || !result.data) {
              throw new Error(result.error?.message || 'Enjoy API contextual translation failed')
            }
            return result.data
          },
          byok: async (req, byokConfig) => {
            const result = await contextualTranslateWithBYOK(
              req.sourceText,
              req.sourceLanguage,
              req.targetLanguage,
              req.context,
              byokConfig,
              req.signal
            )
            if (!result.success || !result.data) {
              throw new Error(result.error?.message || 'BYOK contextual translation failed')
            }
            return result.data
          },
        },
      })

      return createSuccessResponse(
        response,
        AIServiceType.CONTEXTUAL_TRANSLATION,
        provider
      )
    } catch (error) {
      return handleProviderError(
        error,
        ERROR_SMART_TRANSLATION_LOCAL,
        AIServiceType.CONTEXTUAL_TRANSLATION,
        AIProvider.ENJOY
      )
    }
  },
}

