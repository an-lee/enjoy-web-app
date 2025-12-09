/**
 * BYOK Speech Services
 * Handles ASR (Speech-to-Text) and TTS (Text-to-Speech) using official SDKs
 * Supports: OpenAI (Whisper, TTS), Azure Speech
 */

import OpenAI from 'openai'
import type { BYOKConfig, AIServiceResponse, ASRResponse, TTSResponse } from '../../types'
import { AIServiceType, AIProvider } from '../../types'

/**
 * ASR - Automatic Speech Recognition (Speech-to-Text) with BYOK
 */
export async function transcribeWithBYOK(
  audioBlob: Blob,
  language: string | undefined,
  prompt: string | undefined,
  config: BYOKConfig
): Promise<AIServiceResponse<ASRResponse>> {
  try {
    if (config.provider === 'openai' || config.provider === 'custom') {
      // Use OpenAI Whisper API
      const openai = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.endpoint, // Optional custom endpoint
        dangerouslyAllowBrowser: true,
      })

      // Convert Blob to File for OpenAI API
      const audioFile = new File([audioBlob], 'audio.wav', {
        type: audioBlob.type,
      })

      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: config.model || 'whisper-1',
        language,
        prompt,
      })

      return {
        success: true,
        data: {
          text: transcription.text,
          // Note: OpenAI Whisper API doesn't return language in response
          // language: transcription.language,
        },
        metadata: {
          serviceType: AIServiceType.ASR,
          provider: AIProvider.BYOK,
        },
      }
    }

    if (config.provider === 'azure') {
      // Azure Speech SDK would be used here
      // For now, return an error since Azure Speech requires special SDK setup
      // that's better handled in the existing azure-speech.ts service
      return {
        success: false,
        error: {
          code: 'BYOK_AZURE_ASR_NOT_IMPLEMENTED',
          message:
            'Azure Speech ASR with BYOK should use the existing azureSpeechService.transcribeWithKey() method',
        },
        metadata: {
          serviceType: AIServiceType.ASR,
          provider: AIProvider.BYOK,
        },
      }
    }

    return {
      success: false,
      error: {
        code: 'BYOK_ASR_PROVIDER_NOT_SUPPORTED',
        message: `Provider ${config.provider} does not support ASR`,
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
        details: error,
      },
      metadata: {
        serviceType: AIServiceType.ASR,
        provider: AIProvider.BYOK,
      },
    }
  }
}

/**
 * TTS - Text-to-Speech Synthesis with BYOK
 */
export async function synthesizeWithBYOK(
  text: string,
  _language: string,
  voice: string | undefined,
  config: BYOKConfig,
  signal?: AbortSignal
): Promise<AIServiceResponse<TTSResponse>> {
  try {
    if (config.provider === 'openai' || config.provider === 'custom') {
      // Use OpenAI TTS API
      const openai = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.endpoint, // Optional custom endpoint
        dangerouslyAllowBrowser: true,
      })

      const response = await openai.audio.speech.create(
        {
          model: config.model || 'tts-1',
          voice: (voice as any) || 'alloy',
          input: text,
        },
        {
          signal,
        }
      )

      const audioBlob = await response.blob()

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
    }

    if (config.provider === 'azure') {
      // Azure Speech SDK would be used here
      // For now, return an error since Azure Speech requires special SDK setup
      // that's better handled in the existing azure-speech.ts service
      return {
        success: false,
        error: {
          code: 'BYOK_AZURE_TTS_NOT_IMPLEMENTED',
          message:
            'Azure Speech TTS with BYOK should use the existing azureSpeechService.synthesizeWithKey() method',
        },
        metadata: {
          serviceType: AIServiceType.TTS,
          provider: AIProvider.BYOK,
        },
      }
    }

    return {
      success: false,
      error: {
        code: 'BYOK_TTS_PROVIDER_NOT_SUPPORTED',
        message: `Provider ${config.provider} does not support TTS`,
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
        details: error,
      },
      metadata: {
        serviceType: AIServiceType.TTS,
        provider: AIProvider.BYOK,
      },
    }
  }
}

