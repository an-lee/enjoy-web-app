/**
 * Dictionary Contextual Lookup Service
 * Uses AI (LLM) for context-aware word explanations
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
import { ERROR_DICTIONARY_LOCAL_NOT_SUPPORTED } from '../constants'
import {
  createSuccessResponse,
  handleProviderError,
} from '../core/error-handler'
import { routeToProvider } from '../core/provider-router'

export interface DictionaryRequest {
  word: string
  context?: string
  sourceLanguage: string
  targetLanguage: string
  config?: AIServiceConfig
}

/**
 * Dictionary Contextual Lookup Service
 * Provides context-aware word explanations using AI
 */
export const dictionaryService = {
  /**
   * Contextual word lookup with AI explanation
   */
  async lookup(
    request: DictionaryRequest
  ): Promise<AIServiceResponse<DictionaryResponse>> {
    try {
      const { response, provider } = await routeToProvider<
        DictionaryRequest,
        DictionaryResponse
      >({
        serviceType: AIServiceType.DICTIONARY,
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
              throw new Error(result.error?.message || 'Enjoy API dictionary lookup failed')
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
              throw new Error(result.error?.message || 'BYOK dictionary lookup failed')
            }
            return result.data
          },
        },
      })

      return createSuccessResponse(response, AIServiceType.DICTIONARY, provider)
    } catch (error) {
      return handleProviderError(
        error,
        ERROR_DICTIONARY_LOCAL_NOT_SUPPORTED,
        AIServiceType.DICTIONARY,
        AIProvider.ENJOY
      )
    }
  },
}
