/**
 * Smart Translation Service
 * Uses OpenAI-compatible chat completions endpoint (/api/chat/completions)
 *
 * This provides style-aware translation with custom prompts.
 * For basic translation without style support, use translation-service.ts
 */

import { getEnjoyClient } from '../client'
import type { AIServiceResponse, SmartTranslationResponse } from '../../../types'
import { AIServiceType, AIProvider } from '../../../types'
import type { TranslationStyle } from '@/page/db/schema'
import { buildSmartTranslationPrompt } from '../../../prompts'
import { DEFAULT_WORKERS_AI_TEXT_MODEL } from '@/shared/constants'

/**
 * Smart translation with style support
 * Uses OpenAI-compatible chat completions endpoint
 *
 * @param text - Text to translate
 * @param sourceLanguage - Source language code
 * @param targetLanguage - Target language code
 * @param style - Translation style (natural, formal, casual, etc.)
 * @param customPrompt - Custom prompt for translation
 * @param signal - AbortSignal for cancellation
 * @returns Smart translation response with AI model info
 */
export async function smartTranslate(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  style: TranslationStyle,
  customPrompt?: string,
  signal?: AbortSignal
): Promise<AIServiceResponse<SmartTranslationResponse>> {
  try {
    const client = getEnjoyClient()

    // Build prompt using centralized prompt builder
    const { systemPrompt, userPrompt } = buildSmartTranslationPrompt(
      text,
      sourceLanguage,
      targetLanguage,
      style,
      customPrompt
    )

    // Generate translation using LLM
    const translatedText = await client.generateText({
      prompt: userPrompt,
      systemPrompt,
      signal,
    })

    return {
      success: true,
      data: {
        translatedText,
        aiModel: DEFAULT_WORKERS_AI_TEXT_MODEL,
      },
      metadata: {
        serviceType: AIServiceType.SMART_TRANSLATION,
        provider: AIProvider.ENJOY,
      },
    }
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: 'ENJOY_SMART_TRANSLATION_ERROR',
        message: error.message || 'Enjoy API smart translation failed',
      },
      metadata: {
        serviceType: AIServiceType.SMART_TRANSLATION,
        provider: AIProvider.ENJOY,
      },
    }
  }
}

