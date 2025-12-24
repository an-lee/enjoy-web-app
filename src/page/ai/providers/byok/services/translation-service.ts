/**
 * Translation Service (BYOK)
 * Uses user-provided LLM API for basic translation
 *
 * Supports: OpenAI, Claude, Google, Azure OpenAI, Custom endpoints
 */

import { createBYOKClient } from '../client'
import type { BYOKConfig, AIServiceResponse, TranslationResponse } from '../../../types'
import { AIServiceType, AIProvider } from '../../../types'
import { getLanguageName } from '../../../prompts/language-utils'

/**
 * Basic translation
 * Uses user-provided LLM API
 *
 * @param text - Text to translate
 * @param sourceLanguage - Source language code
 * @param targetLanguage - Target language code
 * @param config - BYOK configuration with API key
 * @param signal - AbortSignal for cancellation
 * @returns Translation response
 */
export async function translate(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  config: BYOKConfig,
  signal?: AbortSignal
): Promise<AIServiceResponse<TranslationResponse>> {
  try {
    const client = createBYOKClient(config)

    // Build basic translation prompt
    const srcLangName = getLanguageName(sourceLanguage)
    const tgtLangName = getLanguageName(targetLanguage)

    const systemPrompt = `You are a translation assistant. Translate the text from ${srcLangName} to ${tgtLangName}. Only output the translation, without any explanation, reasoning, or additional text. Do not repeat the output.`
    const userPrompt = text

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
        sourceLanguage,
        targetLanguage,
      },
      metadata: {
        serviceType: AIServiceType.TRANSLATION,
        provider: AIProvider.BYOK,
      },
    }
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: 'BYOK_TRANSLATION_ERROR',
        message: error.message || 'BYOK translation failed',
      },
      metadata: {
        serviceType: AIServiceType.TRANSLATION,
        provider: AIProvider.BYOK,
      },
    }
  }
}

