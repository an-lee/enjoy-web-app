/**
 * Basic Translation Service
 * Uses Cloudflare Workers AI m2m100-1.2b model via /api/translations
 *
 * This is a FREE service for basic translation without style support.
 * For style-aware translation, use smart-translation-service.ts
 */

import { getEnjoyClient } from '../client'
import type { AIServiceResponse, TranslationResponse } from '../../../types'
import { AIServiceType, AIProvider } from '../../../types'

/**
 * Basic translation with Enjoy API
 * Uses Cloudflare Workers AI m2m100-1.2b model (free service)
 *
 * @param text - Text to translate
 * @param sourceLanguage - Source language code
 * @param targetLanguage - Target language code
 * @param signal - AbortSignal for cancellation
 * @returns Translation response
 */
export async function translate(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  signal?: AbortSignal
): Promise<AIServiceResponse<TranslationResponse>> {
  try {
    const client = getEnjoyClient()

    const result = await client.translate({
      text,
      sourceLang: sourceLanguage,
      targetLang: targetLanguage,
      signal,
    })

    return {
      success: true,
      data: {
        translatedText: result.translatedText,
        sourceLanguage,
        targetLanguage,
      },
      metadata: {
        serviceType: AIServiceType.TRANSLATION,
        provider: AIProvider.ENJOY,
      },
    }
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: 'ENJOY_TRANSLATION_ERROR',
        message: error.message || 'Enjoy API translation failed',
      },
      metadata: {
        serviceType: AIServiceType.TRANSLATION,
        provider: AIProvider.ENJOY,
      },
    }
  }
}

