/**
 * TTS (Text-to-Speech) Service (BYOK)
 * Uses user-provided OpenAI TTS API for speech synthesis
 *
 * Supports: OpenAI, Custom endpoints (OpenAI-compatible)
 * Note: For Azure Speech TTS, use azure/tts-service.ts
 */

import { createBYOKClient } from '../client'
import type { BYOKConfig, AIServiceResponse, TTSResponse } from '../../../types'
import { AIServiceType, AIProvider } from '../../../types'

/**
 * Synthesize speech from text
 * Uses OpenAI TTS API (requires OpenAI or custom provider)
 *
 * @param text - Text to synthesize
 * @param language - Language code (used for voice selection hint)
 * @param voice - Voice name (e.g., 'alloy', 'echo', 'fable', etc.)
 * @param config - BYOK configuration with API key
 * @param signal - AbortSignal for cancellation
 * @returns TTS response with audio blob
 */
export async function synthesize(
  text: string,
  language: string,
  voice: string | undefined,
  config: BYOKConfig,
  signal?: AbortSignal
): Promise<AIServiceResponse<TTSResponse>> {
  try {
    const client = createBYOKClient(config)

    const audioBlob = await client.synthesizeSpeech(text, {
      voice: voice || getDefaultVoiceForLanguage(language),
      signal,
    })

    return {
      success: true,
      data: {
        audioBlob,
        format: 'audio/mpeg',
      },
      metadata: {
        serviceType: AIServiceType.TTS,
        provider: AIProvider.BYOK,
      },
    }
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: 'BYOK_TTS_ERROR',
        message: error.message || 'BYOK TTS failed',
      },
      metadata: {
        serviceType: AIServiceType.TTS,
        provider: AIProvider.BYOK,
      },
    }
  }
}

/**
 * Get default voice for a given language
 * Maps language codes to OpenAI voices
 */
function getDefaultVoiceForLanguage(language: string): string {
  // OpenAI voices: alloy, echo, fable, onyx, nova, shimmer
  const voiceMap: Record<string, string> = {
    en: 'alloy',
    'en-US': 'alloy',
    'en-GB': 'fable',
    zh: 'nova',
    'zh-CN': 'nova',
    ja: 'shimmer',
    ko: 'shimmer',
    es: 'echo',
    fr: 'onyx',
    de: 'onyx',
  }

  const baseLanguage = language.split('-')[0].toLowerCase()
  return voiceMap[language] || voiceMap[baseLanguage] || 'alloy'
}

