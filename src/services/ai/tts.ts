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
import type { AIServiceConfig, AIServiceResponse, TTSResponse } from './types'
import { AIServiceType, AIProvider, BYOKProvider } from './types'
import {
  ERROR_TTS_LOCAL,
  ERROR_TTS_AZURE,
  ERROR_TTS_BYOK_AZURE,
  DEFAULT_AZURE_REGION,
  getErrorMessage,
} from './constants'

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
    const provider = request.provider || BYOKProvider.OPENAI
    const useLocal = request.config?.provider === AIProvider.LOCAL
    const useBYOK = request.config?.provider === AIProvider.BYOK

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
            serviceType: AIServiceType.TTS,
            provider: AIProvider.LOCAL,
          },
        }
      } catch (error: any) {
        return {
          success: false,
          error: {
            code: ERROR_TTS_LOCAL,
            message: getErrorMessage(ERROR_TTS_LOCAL, error.message),
          },
          metadata: {
            serviceType: AIServiceType.TTS,
            provider: AIProvider.LOCAL,
          },
        }
      }
    }

    // BYOK mode: use user's own API keys (FUTURE)
    if (useBYOK && request.config?.byok) {
      // For Azure, use existing Azure Speech service
      if (request.config.byok.provider === BYOKProvider.AZURE) {
        try {
          const audioBlob = await azureSpeechService.synthesizeWithKey(
            request.text,
            request.language,
            request.voice,
            {
              subscriptionKey: request.config.byok.apiKey,
              region: request.config.byok.region || DEFAULT_AZURE_REGION,
            }
          )
          return {
            success: true,
            data: { audioBlob, format: 'audio/mpeg' },
            metadata: {
              serviceType: AIServiceType.TTS,
              provider: AIProvider.BYOK,
            },
          }
        } catch (error: any) {
          return {
            success: false,
            error: {
              code: ERROR_TTS_BYOK_AZURE,
              message: getErrorMessage(ERROR_TTS_BYOK_AZURE, error.message),
            },
            metadata: {
              serviceType: AIServiceType.TTS,
              provider: AIProvider.BYOK,
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
    if (provider === BYOKProvider.AZURE) {
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
            serviceType: AIServiceType.TTS,
            provider: AIProvider.ENJOY,
          },
        }
      } catch (error: any) {
        return {
          success: false,
          error: {
            code: ERROR_TTS_AZURE,
            message: getErrorMessage(ERROR_TTS_AZURE, error.message),
          },
          metadata: {
            serviceType: AIServiceType.TTS,
            provider: AIProvider.ENJOY,
          },
        }
      }
    }

    // OpenAI-compatible API (forwarded through Enjoy API)
    return synthesizeWithEnjoy(request.text, request.language, request.voice)
  },
}

