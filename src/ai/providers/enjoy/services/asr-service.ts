/**
 * ASR (Automatic Speech Recognition) Service
 * Uses OpenAI-compatible audio transcriptions endpoint (/api/audio/transcriptions)
 *
 * Provides speech-to-text transcription using Whisper model.
 */

import { getEnjoyClient } from '../client'
import type { AIServiceResponse, ASRResponse } from '../../../types'
import { AIServiceType, AIProvider } from '../../../types'

/**
 * Transcribe speech to text
 * Uses OpenAI-compatible Whisper API
 *
 * @param audioBlob - Audio data to transcribe
 * @param language - Target language code for transcription
 * @param prompt - Context prompt to improve transcription accuracy
 * @returns ASR response with transcribed text
 */
export async function transcribe(
  audioBlob: Blob,
  language?: string,
  prompt?: string
): Promise<AIServiceResponse<ASRResponse>> {
  try {
    const client = getEnjoyClient()

    const result = await client.transcribeSpeech(audioBlob, {
      language,
      prompt,
    })

    return {
      success: true,
      data: {
        text: result.text,
        // Note: OpenAI Whisper API doesn't return segments in basic mode
        // For detailed transcription with timestamps, use verbose_json format
      },
      metadata: {
        serviceType: AIServiceType.ASR,
        provider: AIProvider.ENJOY,
      },
    }
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: 'ENJOY_ASR_ERROR',
        message: error.message || 'Enjoy API ASR failed',
      },
      metadata: {
        serviceType: AIServiceType.ASR,
        provider: AIProvider.ENJOY,
      },
    }
  }
}

