/**
 * Contextual Translation Service
 * Uses OpenAI-compatible chat completions endpoint (/api/chat/completions)
 *
 * This provides context-aware translation using surrounding text.
 * For style-aware translation, use smart-translation-service.ts
 */

import { getEnjoyClient } from '../client'
import type { AIServiceResponse, ContextualTranslationResponse } from '../../../types'
import { AIServiceType, AIProvider } from '../../../types'
import { getLanguageName } from '../../../prompts/language-utils'

/**
 * Contextual translation with context awareness
 * Uses OpenAI-compatible chat completions endpoint
 *
 * @param text - Text to translate
 * @param sourceLanguage - Source language code
 * @param targetLanguage - Target language code
 * @param context - Surrounding text context
 * @param signal - AbortSignal for cancellation
 * @returns Contextual translation response with AI model info
 */
export async function contextualTranslate(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  context: string | undefined,
  signal?: AbortSignal
): Promise<AIServiceResponse<ContextualTranslationResponse>> {
  try {
    const client = getEnjoyClient()

    // Build contextual translation prompt
    const srcLangName = getLanguageName(sourceLanguage)
    const tgtLangName = getLanguageName(targetLanguage)

    let systemPrompt = ''
    let userPrompt = ''

    if (context) {
      systemPrompt = `You are a translation assistant. Translate the text from ${srcLangName} to ${tgtLangName} considering the surrounding context. Only output the translation, without any explanation, reasoning, or additional text. Do not repeat the output.`
      userPrompt = `Context: ${context}\n\nText to translate: ${text}`
    } else {
      systemPrompt = `You are a translation assistant. Translate the text from ${srcLangName} to ${tgtLangName}. Only output the translation, without any explanation, reasoning, or additional text. Do not repeat the output.`
      userPrompt = text
    }

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
      },
      metadata: {
        serviceType: AIServiceType.CONTEXTUAL_TRANSLATION,
        provider: AIProvider.ENJOY,
      },
    }
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: 'ENJOY_CONTEXTUAL_TRANSLATION_ERROR',
        message: error.message || 'Enjoy API contextual translation failed',
      },
      metadata: {
        serviceType: AIServiceType.CONTEXTUAL_TRANSLATION,
        provider: AIProvider.ENJOY,
      },
    }
  }
}

