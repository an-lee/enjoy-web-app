/**
 * Smart Translation Service
 * Supports pre-defined styles and custom prompts
 * Uses generative models for style-based translation
 * Used for user-generated content translation
 */

import { localModelService } from './local'
import { smartTranslateWithBYOK } from './byok'
import { smartTranslateWithEnjoy } from './enjoy'
import type { TranslationStyle } from '@/db/schema'
import type { AIServiceConfig, AIServiceResponse } from './types'
import type { SmartTranslationResponse } from './types-responses'

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
    const useLocal = request.config?.provider === 'local'
    const useBYOK = request.config?.provider === 'byok'

    // Local mode: use transformers.js with generative models
    if (useLocal) {
      try {
        const result = await localModelService.smartTranslate(
          request.sourceText,
          request.sourceLanguage,
          request.targetLanguage,
          request.style,
          request.customPrompt,
          request.config?.localModel
        )
        return {
          success: true,
          data: {
            translatedText: result.translatedText,
            aiModel: 'local-smart-translation',
          },
          metadata: {
            serviceType: 'smartTranslation',
            provider: 'local',
          },
        }
      } catch (error: any) {
        return {
          success: false,
          error: {
            code: 'LOCAL_SMART_TRANSLATION_ERROR',
            message: error.message || 'Local smart translation failed',
          },
          metadata: {
            serviceType: 'smartTranslation',
            provider: 'local',
          },
        }
      }
    }

    // BYOK mode: use user's own API keys with Vercel AI SDK
    if (useBYOK && request.config?.byok) {
      return smartTranslateWithBYOK(
        request.sourceText,
        request.sourceLanguage,
        request.targetLanguage,
        request.style,
        request.customPrompt,
        request.config.byok
      )
    }

    // Enjoy API (cloud service)
    return smartTranslateWithEnjoy(
      request.sourceText,
      request.sourceLanguage,
      request.targetLanguage,
      request.style,
      request.customPrompt
    )
  },
}

