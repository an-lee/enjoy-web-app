/**
 * Dictionary Service (BYOK)
 * Uses user-provided LLM API for AI-powered word lookup
 *
 * Supports: OpenAI, Claude, Google, Azure OpenAI, Custom endpoints
 */

import { createBYOKClient } from '../client'
import type { BYOKConfig, AIServiceResponse, DictionaryResponse } from '../../../types'
import { AIServiceType, AIProvider } from '../../../types'
import { buildDictionaryPrompt, parseDictionaryResponse } from '../../../prompts'

/**
 * Dictionary lookup with AI explanation
 * Uses user-provided LLM API
 *
 * @param word - Word to look up
 * @param context - Context sentence containing the word
 * @param sourceLanguage - Source language of the word
 * @param targetLanguage - Target language for explanations
 * @param config - BYOK configuration with API key
 * @returns Dictionary response with definitions and explanations
 */
export async function lookup(
  word: string,
  context: string | undefined,
  sourceLanguage: string,
  targetLanguage: string,
  config: BYOKConfig
): Promise<AIServiceResponse<DictionaryResponse>> {
  try {
    const client = createBYOKClient(config)

    // Build prompt using centralized prompt builder
    const prompt = buildDictionaryPrompt(
      word,
      context,
      sourceLanguage,
      targetLanguage
    )

    // Generate dictionary entry using LLM
    const responseText = await client.generateText({
      prompt,
    })

    // Parse response using centralized parser
    const dictionaryData = parseDictionaryResponse(responseText)

    return {
      success: true,
      data: dictionaryData,
      metadata: {
        serviceType: AIServiceType.SMART_DICTIONARY,
        provider: AIProvider.BYOK,
      },
    }
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: 'BYOK_SMART_DICTIONARY_ERROR',
        message: error.message || 'BYOK smart dictionary lookup failed',
      },
      metadata: {
        serviceType: AIServiceType.SMART_DICTIONARY,
        provider: AIProvider.BYOK,
      },
    }
  }
}

