/**
 * Smart Translation Service (BYOK)
 * Uses user-provided LLM API for style-aware translation
 *
 * Supports: OpenAI, Claude, Google, Azure OpenAI, Custom endpoints
 */

import { createBYOKClient } from '../client'
import type { BYOKConfig, AIServiceResponse, SmartTranslationResponse } from '../../../types'
import { AIServiceType, AIProvider } from '../../../types'
import type { TranslationStyle } from '@/page/db/schema'
import { buildSmartTranslationPrompt } from '../../../prompts'

/**
 * Smart translation with style support
 * Uses user-provided LLM API
 *
 * @param text - Text to translate
 * @param sourceLanguage - Source language code
 * @param targetLanguage - Target language code
 * @param style - Translation style (natural, formal, casual, etc.)
 * @param customPrompt - Custom prompt for translation
 * @param config - BYOK configuration with API key
 * @param signal - AbortSignal for cancellation
 * @returns Smart translation response with AI model info
 */
export async function smartTranslate(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  style: TranslationStyle,
  customPrompt: string | undefined,
  config: BYOKConfig,
  signal?: AbortSignal
): Promise<AIServiceResponse<SmartTranslationResponse>> {
  try {
    const client = createBYOKClient(config)

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
        aiModel: `${config.provider}/${config.model || 'default'}`,
      },
      metadata: {
        serviceType: AIServiceType.SMART_TRANSLATION,
        provider: AIProvider.BYOK,
      },
    }
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: 'BYOK_SMART_TRANSLATION_ERROR',
        message: error.message || 'BYOK smart translation failed',
      },
      metadata: {
        serviceType: AIServiceType.SMART_TRANSLATION,
        provider: AIProvider.BYOK,
      },
    }
  }
}

