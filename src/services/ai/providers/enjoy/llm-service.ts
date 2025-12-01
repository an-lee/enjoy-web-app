/**
 * Enjoy API LLM Service
 * Uses OpenAI SDK to call Enjoy API (OpenAI-compatible)
 * Reuses the same implementation as BYOK OpenAI
 */

// TODO: When we have direct token access, we can use OpenAI SDK:
// import { generateText } from 'ai'
// import { createOpenAI } from '@ai-sdk/openai'

import { apiClient } from '@/services/api/client'
import type {
  AIServiceResponse,
  SmartTranslationResponse,
  DictionaryResponse,
} from '../../types'
import type { TranslationStyle } from '@/db/schema'
// Prompts will be used when switching to OpenAI SDK
// import { buildSmartTranslationPrompt, buildDictionaryPrompt } from '../prompts'

/**
 * Get Enjoy API configuration
 * Enjoy API is OpenAI-compatible, so we use OpenAI SDK with Enjoy endpoint
 *
 * TODO: When we have direct token access, uncomment and use this function
 */
/*
async function getEnjoyProvider() {
  // Get Enjoy API token from auth store or session
  // For now, we use apiClient which handles auth automatically

  const enjoyApiBaseUrl = import.meta.env.VITE_ENJOY_API_URL || '/api/v1'
  const enjoyApiKey = 'enjoy-api-key' // This will be handled by apiClient

  return createOpenAI({
    apiKey: enjoyApiKey,
    baseURL: enjoyApiBaseUrl,
  })
}
*/

/**
 * Smart Translation with Enjoy API
 * Uses OpenAI SDK with Enjoy API endpoint (OpenAI-compatible)
 */
export async function smartTranslateWithEnjoy(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  style: TranslationStyle,
  customPrompt: string | undefined
): Promise<AIServiceResponse<SmartTranslationResponse>> {
  try {
    // Build prompt using centralized prompt builder (for documentation purposes)
    // When we switch to OpenAI SDK, this prompt will be used directly
    // const prompt = buildSmartTranslationPrompt(...)

    // Note: Currently using apiClient.post() instead of OpenAI SDK
    // because apiClient handles authentication automatically
    // When we have direct token access, we can use:
    // const provider = await getEnjoyProvider()
    // const result = await generateText({
    //   model: provider('gpt-4'),
    //   prompt,
    // })

    // For now, fallback to apiClient
    const response = await apiClient.post<AIServiceResponse<SmartTranslationResponse>>(
      '/api/v1/services/smart-translation',
      {
        sourceText: text,
        sourceLanguage,
        targetLanguage,
        style,
        customPrompt,
      }
    )

    return response.data
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: 'ENJOY_SMART_TRANSLATION_ERROR',
        message: error.message || 'Enjoy API smart translation failed',
      },
      metadata: {
        serviceType: 'smartTranslation',
        provider: 'enjoy',
      },
    }
  }
}

/**
 * Dictionary Lookup with Enjoy API
 * Uses OpenAI SDK with Enjoy API endpoint (OpenAI-compatible)
 */
export async function dictionaryLookupWithEnjoy(
  word: string,
  context: string | undefined,
  sourceLanguage: string,
  targetLanguage: string
): Promise<AIServiceResponse<DictionaryResponse>> {
  try {
    // Build prompt using centralized prompt builder (for documentation purposes)
    // When we switch to OpenAI SDK, this prompt will be used directly
    // const prompt = buildDictionaryPrompt(...)

    // Note: Currently using apiClient.post() instead of OpenAI SDK
    // See comment in smartTranslateWithEnjoy() for details

    const response = await apiClient.post<AIServiceResponse<DictionaryResponse>>(
      '/api/v1/services/dictionary',
      {
        word,
        context,
        sourceLanguage,
        targetLanguage,
      }
    )

    return response.data
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: 'ENJOY_SMART_DICTIONARY_ERROR',
        message: error.message || 'Enjoy API smart dictionary lookup failed',
      },
      metadata: {
        serviceType: 'smartDictionary',
        provider: 'enjoy',
      },
    }
  }
}

