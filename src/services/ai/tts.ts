/**
 * Text-to-Speech Service (TTS)
 * Generates audio from text for shadowing practice materials
 *
 * Supported providers:
 * - enjoy: Enjoy API (OpenAI-compatible)
 * - local: Browser-based Web Speech API or transformers.js
 * - byok: User's own API keys (FUTURE - interface reserved)
 */

import { azureSpeechService } from './enjoy/azure-speech'
import { localModelService } from './local'
import { synthesizeWithBYOK } from './byok'
import { synthesizeWithEnjoy } from './enjoy'
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

    // BYOK mode: use user's own API keys (FUTURE)
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

      // For OpenAI and custom providers, use BYOK speech service (FUTURE)
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
    return synthesizeWithEnjoy(request.text, request.language, request.voice)
  },
}

