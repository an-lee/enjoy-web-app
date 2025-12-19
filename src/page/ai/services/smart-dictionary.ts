/**
 * Smart Dictionary Service (Contextual AI-powered)
 * Uses AI (LLM) for context-aware word explanations
 *
 * Note: This is the AI-powered contextual dictionary service.
 * For basic dictionary lookup (FREE), use @/services/api/dictionary
 */

import { localModelService } from '../providers/local'
import { dictionaryLookupWithBYOK } from '../providers/byok'
import { dictionaryLookupWithEnjoy } from '../providers/enjoy'
import type {
  AIServiceConfig,
  AIServiceResponse,
  DictionaryResponse,
} from '../types'
import { AIServiceType, AIProvider } from '../types'
import { ERROR_SMART_DICTIONARY_LOCAL_NOT_SUPPORTED } from '../constants'
import {
  createSuccessResponse,
  handleProviderError,
} from '../core/error-handler'
import { routeToProvider } from '../core/provider-router'

export interface SmartDictionaryRequest {
  word: string
  context?: string
  sourceLanguage: string
  targetLanguage: string
  config?: AIServiceConfig
}

/**
 * Smart Dictionary Service (Contextual AI-powered)
 * Provides context-aware word explanations using AI
 */
export const smartDictionaryService = {
  /**
   * Contextual word lookup with AI explanation
   */
  async lookup(
    request: SmartDictionaryRequest
  ): Promise<AIServiceResponse<DictionaryResponse>> {
    try {
      const { response, provider } = await routeToProvider<
        SmartDictionaryRequest,
        DictionaryResponse
      >({
        serviceType: AIServiceType.SMART_DICTIONARY,
        request,
        config: request.config,
        handlers: {
          local: async (req, config) => {
            return await localModelService.lookup(
              req.word,
              req.context,
              req.sourceLanguage,
              req.targetLanguage,
              config?.localModel
            )
          },
          enjoy: async (req) => {
            const result = await dictionaryLookupWithEnjoy(
              req.word,
              req.context,
              req.sourceLanguage,
              req.targetLanguage
            )
            if (!result.success || !result.data) {
              throw new Error(result.error?.message || 'Enjoy API smart dictionary lookup failed')
            }
            return result.data
          },
          byok: async (req, byokConfig) => {
            const result = await dictionaryLookupWithBYOK(
              req.word,
              req.context,
              req.sourceLanguage,
              req.targetLanguage,
              byokConfig
            )
            if (!result.success || !result.data) {
              throw new Error(result.error?.message || 'BYOK smart dictionary lookup failed')
            }
            return result.data
          },
        },
      })

      return createSuccessResponse(response, AIServiceType.SMART_DICTIONARY, provider)
    } catch (error) {
      return handleProviderError(
        error,
        ERROR_SMART_DICTIONARY_LOCAL_NOT_SUPPORTED,
        AIServiceType.SMART_DICTIONARY,
        AIProvider.ENJOY
      )
    }
  },
}

