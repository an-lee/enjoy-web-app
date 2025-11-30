/**
 * Enjoy API Speech Services
 * Uses OpenAI SDK to call Enjoy API (OpenAI-compatible)
 * Reuses the same implementation as BYOK OpenAI
 */

// TODO: When we have direct token access, we can use OpenAI SDK:
// import OpenAI from 'openai'

import { apiClient } from '@/lib/api/client'
import type { AIServiceResponse } from '../types'
import type { ASRResponse, TTSResponse } from '../types-responses'

/**
 * ASR (Speech-to-Text) with Enjoy API
 * Uses OpenAI Whisper API format (Enjoy API is OpenAI-compatible)
 */
export async function transcribeWithEnjoy(
  audioBlob: Blob,
  language: string | undefined,
  prompt: string | undefined
): Promise<AIServiceResponse<ASRResponse>> {
  try {
    // Note: Currently using apiClient with multipart/form-data
    // When we have direct token access, we can use OpenAI SDK:
    // const openai = new OpenAI({
    //   apiKey: enjoyApiKey,
    //   baseURL: enjoyApiBaseUrl,
    //   dangerouslyAllowBrowser: true,
    // })
    // const audioFile = new File([audioBlob], 'audio.wav')
    // const transcription = await openai.audio.transcriptions.create({
    //   file: audioFile,
    //   model: 'whisper-1',
    //   language,
    //   prompt,
    // })

    const formData = new FormData()
    formData.append('audio', audioBlob, 'audio.wav')
    if (language) formData.append('language', language)
    if (prompt) formData.append('prompt', prompt)
    formData.append('provider', 'openai')

    const response = await apiClient.post<AIServiceResponse<ASRResponse>>(
      '/api/v1/services/asr',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )

    return response.data
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: 'ENJOY_ASR_ERROR',
        message: error.message || 'Enjoy API ASR failed',
      },
      metadata: {
        serviceType: 'asr',
        provider: 'enjoy',
      },
    }
  }
}

/**
 * TTS (Text-to-Speech) with Enjoy API
 * Uses OpenAI TTS API format (Enjoy API is OpenAI-compatible)
 */
export async function synthesizeWithEnjoy(
  text: string,
  language: string,
  voice: string | undefined
): Promise<AIServiceResponse<TTSResponse>> {
  try {
    // Note: Currently using apiClient
    // When we have direct token access, we can use OpenAI SDK:
    // const openai = new OpenAI({
    //   apiKey: enjoyApiKey,
    //   baseURL: enjoyApiBaseUrl,
    //   dangerouslyAllowBrowser: true,
    // })
    // const response = await openai.audio.speech.create({
    //   model: 'tts-1',
    //   voice: voice || 'alloy',
    //   input: text,
    // })
    // const audioBlob = await response.blob()

    const response = await apiClient.post<AIServiceResponse<TTSResponse>>(
      '/api/v1/services/tts',
      {
        text,
        language,
        voice,
        provider: 'openai',
      }
    )

    return response.data
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: 'ENJOY_TTS_ERROR',
        message: error.message || 'Enjoy API TTS failed',
      },
      metadata: {
        serviceType: 'tts',
        provider: 'enjoy',
      },
    }
  }
}

