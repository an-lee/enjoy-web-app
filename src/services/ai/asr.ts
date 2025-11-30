/**
 * Automatic Speech Recognition Service (ASR/STT)
 * Supports Azure Speech, OpenAI-compatible API, and local transformers.js models
 */

import { azureSpeechService } from './enjoy/azure-speech'
import { localModelService } from './local'
import { transcribeWithBYOK } from './byok'
import { transcribeWithEnjoy } from './enjoy'
import type { AIServiceConfig, AIServiceResponse } from './types'
import type { ASRResponse } from './types-responses'

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
    const provider = request.provider || 'openai'
    const useLocal = request.config?.provider === 'local'
    const useBYOK = request.config?.provider === 'byok'

    // Local mode: use transformers.js
    if (useLocal || provider === 'local') {
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
            serviceType: 'asr',
            provider: 'local',
          },
        }
      } catch (error: any) {
        return {
          success: false,
          error: {
            code: 'LOCAL_ASR_ERROR',
            message: error.message || 'Local ASR failed',
          },
          metadata: {
            serviceType: 'asr',
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
          const result = await azureSpeechService.transcribeWithKey(
            request.audioBlob,
            request.language,
            {
              subscriptionKey: request.config.byok.apiKey,
              region: request.config.byok.region || 'eastus',
            }
          )
          return {
            success: true,
            data: result,
            metadata: {
              serviceType: 'asr',
              provider: 'byok',
            },
          }
        } catch (error: any) {
          return {
            success: false,
            error: {
              code: 'BYOK_AZURE_ASR_ERROR',
              message: error.message,
            },
            metadata: {
              serviceType: 'asr',
              provider: 'byok',
            },
          }
        }
      }

      // For OpenAI and custom providers, use BYOK speech service
      return transcribeWithBYOK(
        request.audioBlob,
        request.language,
        request.prompt,
        request.config.byok
      )
    }

    // Azure Speech handling (Enjoy API managed)
    if (provider === 'azure') {
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
            serviceType: 'asr',
            provider: 'enjoy',
          },
        }
      } catch (error: any) {
        return {
          success: false,
          error: {
            code: 'AZURE_ASR_ERROR',
            message: error.message,
          },
          metadata: {
            serviceType: 'asr',
            provider: 'enjoy',
          },
        }
      }
    }

    // OpenAI-compatible API (forwarded through Enjoy API)
    return transcribeWithEnjoy(request.audioBlob, request.language, request.prompt)
  },
}

