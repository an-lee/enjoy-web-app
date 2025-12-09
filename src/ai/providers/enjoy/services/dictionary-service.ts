/**
 * Dictionary Service
 * Uses OpenAI-compatible chat completions endpoint (/api/chat/completions)
 *
 * Provides AI-powered contextual word explanations using LLM.
 */

import { getEnjoyClient } from '../client'
import type { AIServiceResponse, DictionaryResponse } from '../../../types'
import { AIServiceType, AIProvider } from '../../../types'
import { buildDictionaryPrompt, parseDictionaryResponse } from '../../../prompts'

/**
 * Dictionary lookup with AI explanation
 * Uses OpenAI-compatible chat completions endpoint
 *
 * @param word - Word to look up
 * @param context - Context sentence containing the word
 * @param sourceLanguage - Source language of the word
 * @param targetLanguage - Target language for explanations
 * @returns Dictionary response with definitions and explanations
 */
export async function lookup(
  word: string,
  context: string | undefined,
  sourceLanguage: string,
  targetLanguage: string
): Promise<AIServiceResponse<DictionaryResponse>> {
  try {
    const client = getEnjoyClient()

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
        provider: AIProvider.ENJOY,
      },
    }
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: 'ENJOY_SMART_DICTIONARY_ERROR',
        message: error.message || 'Enjoy API smart dictionary lookup failed',
      },
      metadata: {
        serviceType: AIServiceType.SMART_DICTIONARY,
        provider: AIProvider.ENJOY,
      },
    }
  }
}

