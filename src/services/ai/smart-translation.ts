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
import { DEFAULT_SMART_TRANSLATION_MODEL } from './local/constants'
import type { TranslationStyle } from '@/db/schema'
import type {
  AIServiceConfig,
  AIServiceResponse,
  SmartTranslationResponse,
} from './types'
import { AIServiceType, AIProvider } from './types'
import { ERROR_SMART_TRANSLATION_LOCAL, getErrorMessage } from './constants'

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
    const useLocal = request.config?.provider === AIProvider.LOCAL
    const useBYOK = request.config?.provider === AIProvider.BYOK

    // Local mode: use transformers.js with generative models
    if (useLocal) {
      try {
        const modelName =
          request.config?.localModel?.model || DEFAULT_SMART_TRANSLATION_MODEL
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
            aiModel: `local/${modelName}`,
          },
          metadata: {
            serviceType: AIServiceType.SMART_TRANSLATION,
            provider: AIProvider.LOCAL,
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
            serviceType: AIServiceType.SMART_TRANSLATION,
            provider: AIProvider.LOCAL,
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

