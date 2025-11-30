/**
 * Text-to-Speech Service (TTS)
 * Supports OpenAI-compatible API, Azure Speech, and local models
 * Future support for BYOK (user-provided keys)
 */

import { apiClient } from '@/lib/api/client'
import { azureSpeechService } from './azure-speech'
import { localModelService } from './local'
import { synthesizeWithBYOK } from './byok'
import type { AIServiceConfig, AIServiceResponse } from './types'
import type { TTSResponse } from './types-responses'

export type TTSProvider = 'openai' | 'azure'

export interface TTSRequest {
  text: string
  language: string
  voice?: string
  provider?: TTSProvider
  config?: AIServiceConfig
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
    const useLocal = request.config?.provider === 'local'
    const useBYOK = request.config?.provider === 'byok'

    // Local mode: use transformers.js or Web Speech API
    if (useLocal) {
      try {
        const result = await localModelService.synthesize(
          request.text,
          request.language,
          request.voice,
          request.config?.localModel
        )
        return {
          success: true,
          data: {
            audioBlob: result.audioBlob,
            format: result.format,
            duration: result.duration,
          },
          metadata: {
            serviceType: 'tts',
            provider: 'local',
          },
        }
      } catch (error: any) {
        return {
          success: false,
          error: {
            code: 'LOCAL_TTS_ERROR',
            message: error.message || 'Local TTS failed',
          },
          metadata: {
            serviceType: 'tts',
            provider: 'local',
          },
        }
      }
    }

    // BYOK mode: use user's own API keys
    if (useBYOK && request.config?.byok) {
      // For Azure, use existing Azure Speech service
      if (request.config.byok.provider === 'azure') {
        try {
          const audioBlob = await azureSpeechService.synthesizeWithKey(
            request.text,
            request.language,
            request.voice,
            {
              subscriptionKey: request.config.byok.apiKey,
              region: request.config.byok.region || 'eastus',
            }
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
              code: 'BYOK_AZURE_TTS_ERROR',
              message: error.message,
            },
            metadata: {
              serviceType: 'tts',
              provider: 'byok',
            },
          }
        }
      }

      // For OpenAI and custom providers, use BYOK speech service
      return synthesizeWithBYOK(
        request.text,
        request.language,
        request.voice,
        request.config.byok
      )
    }

    // Azure Speech special handling (Enjoy API managed)
    if (provider === 'azure') {
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

