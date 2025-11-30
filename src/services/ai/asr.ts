/**
 * Automatic Speech Recognition Service (ASR/STT)
 * Uses Whisper model for speech-to-text with timestamps
 *
 * Supported providers:
 * - enjoy: Enjoy API (OpenAI-compatible, uses Whisper)
 * - local: Browser-based transformers.js (offline)
 * - byok: User's own API keys (FUTURE - interface reserved)
 */

import { azureSpeechService } from './enjoy/azure-speech'
import { localModelService } from './local'
import { transcribeWithBYOK } from './byok'
import { transcribeWithEnjoy } from './enjoy'
import type { AIServiceConfig, AIServiceResponse } from './types'
import type { ASRResponse } from './types-responses'
import {
  ERROR_ASR_LOCAL,
  ERROR_ASR_AZURE,
  ERROR_ASR_BYOK_AZURE,
  SERVICE_TYPES,
  AI_PROVIDERS,
  BYOK_PROVIDERS,
  DEFAULT_AZURE_REGION,
  getErrorMessage,
} from './constants'

export type ASRProvider = 'openai' | 'azure' | 'local'

export interface ASRRequest {
  audioBlob: Blob
  language?: string
  prompt?: string
  provider?: ASRProvider
  config?: AIServiceConfig
}

/**
 * Automatic Speech Recognition Service
 */
export const asrService = {
  /**
   * Transcribe speech to text
   */
  async transcribe(
    request: ASRRequest
  ): Promise<AIServiceResponse<ASRResponse>> {
    const provider = request.provider || BYOK_PROVIDERS.OPENAI
    const useLocal = request.config?.provider === AI_PROVIDERS.LOCAL
    const useBYOK = request.config?.provider === AI_PROVIDERS.BYOK

    // Local mode: use transformers.js
    if (useLocal || provider === AI_PROVIDERS.LOCAL) {
      try {
        const result = await localModelService.transcribe(
          request.audioBlob,
          request.language,
          request.config?.localModel
        )
        return {
          success: true,
          data: {
            text: result.text,
            segments: result.segments,
            language: result.language,
          },
          metadata: {
            serviceType: SERVICE_TYPES.ASR,
            provider: AI_PROVIDERS.LOCAL,
          },
        }
      } catch (error: any) {
        return {
          success: false,
          error: {
            code: ERROR_ASR_LOCAL,
            message: getErrorMessage(ERROR_ASR_LOCAL, error.message),
          },
          metadata: {
            serviceType: SERVICE_TYPES.ASR,
            provider: AI_PROVIDERS.LOCAL,
          },
        }
      }
    }

    // BYOK mode: use user's own API keys (FUTURE)
    if (useBYOK && request.config?.byok) {
      // For Azure, use existing Azure Speech service
      if (request.config.byok.provider === BYOK_PROVIDERS.AZURE) {
        try {
          const result = await azureSpeechService.transcribeWithKey(
            request.audioBlob,
            request.language,
            {
              subscriptionKey: request.config.byok.apiKey,
              region: request.config.byok.region || DEFAULT_AZURE_REGION,
            }
          )
          return {
            success: true,
            data: result,
            metadata: {
              serviceType: SERVICE_TYPES.ASR,
              provider: AI_PROVIDERS.BYOK,
            },
          }
        } catch (error: any) {
          return {
            success: false,
            error: {
              code: ERROR_ASR_BYOK_AZURE,
              message: getErrorMessage(ERROR_ASR_BYOK_AZURE, error.message),
            },
            metadata: {
              serviceType: SERVICE_TYPES.ASR,
              provider: AI_PROVIDERS.BYOK,
            },
          }
        }
      }

      // For OpenAI and custom providers, use BYOK speech service (FUTURE)
      return transcribeWithBYOK(
        request.audioBlob,
        request.language,
        request.prompt,
        request.config.byok
      )
    }

    // Azure Speech handling (Enjoy API managed)
    if (provider === BYOK_PROVIDERS.AZURE) {
      try {
        const token = await azureSpeechService.getToken()
        const result = await azureSpeechService.transcribeWithToken(
          request.audioBlob,
          request.language,
          token
        )
        return {
          success: true,
          data: result,
          metadata: {
            serviceType: SERVICE_TYPES.ASR,
            provider: AI_PROVIDERS.ENJOY,
          },
        }
      } catch (error: any) {
        return {
          success: false,
          error: {
            code: ERROR_ASR_AZURE,
            message: getErrorMessage(ERROR_ASR_AZURE, error.message),
          },
          metadata: {
            serviceType: SERVICE_TYPES.ASR,
            provider: AI_PROVIDERS.ENJOY,
          },
        }
      }
    }

    // OpenAI-compatible API (forwarded through Enjoy API)
    return transcribeWithEnjoy(request.audioBlob, request.language, request.prompt)
  },
}

