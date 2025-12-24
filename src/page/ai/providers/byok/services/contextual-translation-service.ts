/**
 * Contextual Translation Service (BYOK)
 * Uses user-provided LLM API for context-aware translation
 *
 * Supports: OpenAI, Claude, Google, Azure OpenAI, Custom endpoints
 */

import { createBYOKClient } from '../client'
import type { BYOKConfig, AIServiceResponse, ContextualTranslationResponse } from '../../../types'
import { AIServiceType, AIProvider } from '../../../types'
import { getLanguageName } from '../../../prompts/language-utils'

/**
 * Contextual translation with context awareness
 * Uses user-provided LLM API
 *
 * @param text - Text to translate
 * @param sourceLanguage - Source language code
 * @param targetLanguage - Target language code
 * @param context - Surrounding text context
 * @param config - BYOK configuration with API key
 * @param signal - AbortSignal for cancellation
 * @returns Contextual translation response with AI model info
 */
export async function contextualTranslate(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  context: string | undefined,
  config: BYOKConfig,
  signal?: AbortSignal
): Promise<AIServiceResponse<ContextualTranslationResponse>> {
  try {
    const client = createBYOKClient(config)

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
        aiModel: `${config.provider}/${config.model || 'default'}`,
      },
      metadata: {
        serviceType: AIServiceType.CONTEXTUAL_TRANSLATION,
        provider: AIProvider.BYOK,
      },
    }
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: 'BYOK_CONTEXTUAL_TRANSLATION_ERROR',
        message: error.message || 'BYOK contextual translation failed',
      },
      metadata: {
        serviceType: AIServiceType.CONTEXTUAL_TRANSLATION,
        provider: AIProvider.BYOK,
      },
    }
  }
}

