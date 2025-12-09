/**
 * ASR (Automatic Speech Recognition) Service (BYOK)
 * Uses user-provided OpenAI Whisper API for speech-to-text
 *
 * Supports: OpenAI, Custom endpoints (OpenAI-compatible)
 * Note: For Azure Speech ASR, use azure/asr-service.ts
 */

import { createBYOKClient } from '../client'
import type { BYOKConfig, AIServiceResponse, ASRResponse } from '../../../types'
import { AIServiceType, AIProvider } from '../../../types'

/**
 * Transcribe speech to text
 * Uses OpenAI Whisper API (requires OpenAI or custom provider)
 *
 * @param audioBlob - Audio data to transcribe
 * @param language - Target language code for transcription
 * @param prompt - Context prompt to improve transcription accuracy
 * @param config - BYOK configuration with API key
 * @returns ASR response with transcribed text
 */
export async function transcribe(
  audioBlob: Blob,
  language: string | undefined,
  prompt: string | undefined,
  config: BYOKConfig
): Promise<AIServiceResponse<ASRResponse>> {
  try {
    const client = createBYOKClient(config)

    const result = await client.transcribeSpeech(audioBlob, {
      language,
      prompt,
    })

    return {
      success: true,
      data: {
        text: result.text,
      },
      metadata: {
        serviceType: AIServiceType.ASR,
        provider: AIProvider.BYOK,
      },
    }
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: 'BYOK_ASR_ERROR',
        message: error.message || 'BYOK ASR failed',
      },
      metadata: {
        serviceType: AIServiceType.ASR,
        provider: AIProvider.BYOK,
      },
    }
  }
}

