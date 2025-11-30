/**
 * Smart Translation Service
 * Style-aware translation using LLM with unified prompts
 *
 * Supported providers:
 * - enjoy: Enjoy API (OpenAI-compatible)
 * - local: Browser-based transformers.js (limited features)
 * - byok: User's own API keys (FUTURE - interface reserved)
 *
 * Translation styles: literal, natural, casual, formal, simplified, detailed, custom
 * All providers use the same centralized prompts for consistent output
 */

import { localModelService } from './local'
import { smartTranslateWithBYOK } from './byok'
import { smartTranslateWithEnjoy } from './enjoy'
import type { TranslationStyle } from '@/db/schema'
import type { AIServiceConfig, AIServiceResponse } from './types'
import type { SmartTranslationResponse } from './types-responses'
import {
  ERROR_SMART_TRANSLATION_LOCAL,
  SERVICE_TYPES,
  AI_PROVIDERS,
  getErrorMessage,
} from './constants'

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
    const useLocal = request.config?.provider === AI_PROVIDERS.LOCAL
    const useBYOK = request.config?.provider === AI_PROVIDERS.BYOK

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
            serviceType: SERVICE_TYPES.SMART_TRANSLATION,
            provider: AI_PROVIDERS.LOCAL,
          },
        }
      } catch (error: any) {
        return {
          success: false,
          error: {
            code: ERROR_SMART_TRANSLATION_LOCAL,
            message: error.message || getErrorMessage(ERROR_SMART_TRANSLATION_LOCAL),
          },
          metadata: {
            serviceType: SERVICE_TYPES.SMART_TRANSLATION,
            provider: AI_PROVIDERS.LOCAL,
          },
        }
      }
    }

    // BYOK mode: use user's own API keys with Vercel AI SDK (FUTURE)
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

