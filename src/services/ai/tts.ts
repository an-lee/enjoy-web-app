/**
 * Text-to-Speech Service (TTS)
 * Supports OpenAI-compatible API and Azure Speech
 * Future support for BYOK (user-provided keys)
 */

import { apiClient } from '@/lib/api/client'
import { azureSpeechService } from './azure-speech'
import type { AIServiceConfig, AIServiceResponse } from './types'

export type TTSProvider = 'openai' | 'azure'

export interface TTSRequest {
  text: string
  language: string
  voice?: string
  provider?: TTSProvider
  config?: AIServiceConfig
}

export interface TTSResponse {
  audioUrl?: string
  audioBlob?: Blob
  duration?: number
  format?: string
}

/**
 * Text-to-Speech Service
 */
export const ttsService = {
  /**
   * Synthesize speech
   */
  async synthesize(
    request: TTSRequest
  ): Promise<AIServiceResponse<TTSResponse>> {
    const provider = request.provider || 'openai'
    const useBYOK = request.config?.provider === 'byok'

    // Azure Speech special handling
    if (provider === 'azure') {
      // If using BYOK, use Azure SDK directly (user provides key)
      if (useBYOK && request.config?.apiKeys?.azure) {
        try {
          const audioBlob = await azureSpeechService.synthesizeWithKey(
            request.text,
            request.language,
            request.voice,
            request.config.apiKeys.azure
          )
          return {
            success: true,
            data: { audioBlob, format: 'audio/mpeg' },
            metadata: {
              serviceType: 'tts',
              provider: 'byok',
            },
          }
        } catch (error: any) {
          return {
            success: false,
            error: {
              code: 'AZURE_TTS_ERROR',
              message: error.message,
            },
            metadata: {
              serviceType: 'tts',
              provider: 'byok',
            },
          }
        }
      } else {
        // Use Azure token from Enjoy API
        try {
          const token = await azureSpeechService.getToken()
          const audioBlob = await azureSpeechService.synthesizeWithToken(
            request.text,
            request.language,
            request.voice,
            token
          )
          return {
            success: true,
            data: { audioBlob, format: 'audio/mpeg' },
            metadata: {
              serviceType: 'tts',
              provider: 'enjoy',
            },
          }
        } catch (error: any) {
          return {
            success: false,
            error: {
              code: 'AZURE_TTS_ERROR',
              message: error.message,
            },
            metadata: {
              serviceType: 'tts',
              provider: 'enjoy',
            },
          }
        }
      }
    }

    // OpenAI-compatible API (forwarded through Enjoy API)
    try {
      const response = await apiClient.post<AIServiceResponse<TTSResponse>>(
        '/api/v1/services/tts',
        {
          text: request.text,
          language: request.language,
          voice: request.voice,
          provider,
          config: request.config,
        }
      )
      return response.data
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.response?.data?.error?.code || 'TTS_ERROR',
          message: error.response?.data?.error?.message || error.message,
        },
        metadata: {
          serviceType: 'tts',
          provider: request.config?.provider || 'enjoy',
        },
      }
    }
  },
}

