/**
 * BYOK LLM Service
 * Uses Vercel AI SDK to provide unified interface for multiple LLM providers
 * Supports: OpenAI, Claude, Gemini, and custom endpoints
 */

import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import type {
  BYOKConfig,
  AIServiceResponse,
  SmartTranslationResponse,
  DictionaryResponse,
} from '../../types'
import { AIServiceType, AIProvider } from '../../types'
import type { TranslationStyle } from '@/db/schema'
import {
  buildSmartTranslationPrompt,
  buildDictionaryPrompt,
  parseDictionaryResponse,
} from '../../prompts'

/**
 * Get model provider function from Vercel AI SDK
 */
function getModelProvider(config: BYOKConfig) {
  switch (config.provider) {
    case 'openai':
      return createOpenAI({ apiKey: config.apiKey })
    case 'claude':
      return createAnthropic({ apiKey: config.apiKey })
    case 'google':
      return createGoogleGenerativeAI({ apiKey: config.apiKey })
    case 'azure':
      return createOpenAI({
        apiKey: config.apiKey,
        baseURL: config.endpoint,
      })
    case 'custom':
      return createOpenAI({
        apiKey: config.apiKey,
        baseURL: config.endpoint,
      })
    default:
      throw new Error(`Provider ${config.provider} not supported for LLM services`)
  }
}

/**
 * Generate text using BYOK LLM provider
 * Unified interface for all LLM text generation
 */
export async function generateWithBYOK(
  prompt: string,
  config: BYOKConfig,
  systemPrompt?: string
): Promise<string> {
  const provider = getModelProvider(config)

  try {
    const result = await generateText({
      model: provider(config.model || 'gpt-4'),
      system: systemPrompt,
      prompt,
    })

    return result.text
  } catch (error: any) {
    throw new Error(
      `BYOK LLM generation failed: ${error.message || String(error)}`
    )
  }
}

/**
 * Smart Translation with BYOK
 * Uses unified prompts from centralized prompt management
 */
export async function smartTranslateWithBYOK(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  style: TranslationStyle,
  customPrompt: string | undefined,
  config: BYOKConfig
): Promise<AIServiceResponse<SmartTranslationResponse>> {
  try {
    // Use centralized prompt builder
    const { systemPrompt, userPrompt } = buildSmartTranslationPrompt(
      text,
      sourceLanguage,
      targetLanguage,
      style,
      customPrompt
    )

    // Generate translation with system and user prompts
    const translatedText = await generateWithBYOK(userPrompt, config, systemPrompt)

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

/**
 * Dictionary Lookup with BYOK
 * Uses unified prompts from centralized prompt management
 */
export async function dictionaryLookupWithBYOK(
  word: string,
  context: string | undefined,
  sourceLanguage: string,
  targetLanguage: string,
  config: BYOKConfig
): Promise<AIServiceResponse<DictionaryResponse>> {
  try {
    // Use centralized prompt builder
    const prompt = buildDictionaryPrompt(
      word,
      context,
      sourceLanguage,
      targetLanguage
    )

    // Generate dictionary entry
    const responseText = await generateWithBYOK(prompt, config)

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

