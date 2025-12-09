/**
 * Automatic Speech Recognition Service (ASR/STT)
 * Uses Whisper model for speech-to-text with timestamps
 */

import { azureSpeechService } from '../providers/enjoy/azure-speech'
import { localModelService } from '../providers/local'
import { transcribeWithBYOK } from '../providers/byok'
import { transcribeWithEnjoy } from '../providers/enjoy'
import type { AIServiceConfig, AIServiceResponse, ASRResponse } from '../types'
import { AIServiceType, AIProvider, BYOKProvider } from '../types'
import { ERROR_ASR_AZURE } from '../constants'
import {
  createSuccessResponse,
  handleProviderError,
} from '../core/error-handler'
import { routeToProvider } from '../core/provider-router'

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
    try {
      // Special case: Azure Speech via Enjoy API (legacy provider parameter)
      if (request.provider === BYOKProvider.AZURE && !request.config?.provider) {
        const token = await azureSpeechService.getToken()
        const result = await azureSpeechService.transcribeWithToken(
          request.audioBlob,
          request.language,
          token
        )
        return createSuccessResponse(result, AIServiceType.ASR, AIProvider.ENJOY)
      }

      // Use unified provider router
      const { response, provider } = await routeToProvider<ASRRequest, ASRResponse>({
        serviceType: AIServiceType.ASR,
        request,
        config: request.config,
        handlers: {
          local: async (req, config) => {
            const result = await localModelService.transcribe(
              req.audioBlob,
              req.language,
              config?.localModel
            )
            return {
              text: result.text,
              segments: result.segments,
              language: result.language,
            }
          },
          enjoy: async (req) => {
            const result = await transcribeWithEnjoy(
              req.audioBlob,
              req.language,
              req.prompt
            )
            if (!result.success || !result.data) {
              throw new Error(result.error?.message || 'Enjoy API ASR failed')
            }
            return result.data
          },
          byok: async (req, byokConfig) => {
            const result = await transcribeWithBYOK(
              req.audioBlob,
              req.language,
              req.prompt,
              byokConfig
            )
            if (!result.success || !result.data) {
              throw new Error(result.error?.message || 'BYOK ASR failed')
            }
            return result.data
          },
          byokAzure: async (req, azureConfig) => {
            return await azureSpeechService.transcribeWithKey(
              req.audioBlob,
              req.language,
              azureConfig
            )
          },
        },
      })

      return createSuccessResponse(response, AIServiceType.ASR, provider)
    } catch (error) {
      return handleProviderError(
        error,
        ERROR_ASR_AZURE,
        AIServiceType.ASR,
        AIProvider.ENJOY
      )
    }
  },
}
