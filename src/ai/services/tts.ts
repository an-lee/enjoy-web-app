/**
 * Text-to-Speech Service (TTS)
 * Generates audio from text for shadowing practice materials
 *
 * Provider support:
 * - Enjoy: Azure Speech with token from /api/azure/tokens
 * - Local: Browser-based TTS (transformers.js)
 * - BYOK OpenAI: OpenAI TTS API
 * - BYOK Azure: Azure Speech with user's subscription key
 */

import { byokAzureSpeechService } from '../providers/byok'
import { localModelService } from '../providers/local'
import { synthesizeWithBYOK } from '../providers/byok'
import { synthesizeWithEnjoy } from '../providers/enjoy'
import type { AIServiceConfig, AIServiceResponse, TTSResponse } from '../types'
import { AIServiceType, AIProvider } from '../types'
import { ERROR_TTS_AZURE } from '../constants'
import {
  createSuccessResponse,
  handleProviderError,
} from '../core/error-handler'
import { routeToProvider } from '../core/provider-router'

export type TTSProvider = 'openai' | 'azure'

export interface TTSRequest {
  text: string
  language: string
  voice?: string
  provider?: TTSProvider
  config?: AIServiceConfig
  signal?: AbortSignal
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
    try {
      // Use unified provider router
      const { response, provider } = await routeToProvider<TTSRequest, TTSResponse>({
        serviceType: AIServiceType.TTS,
        request,
        config: request.config,
        handlers: {
          local: async (req, config) => {
            const result = await localModelService.synthesize(
              req.text,
              req.language,
              req.voice,
              config?.localModel,
              req.signal
            )
            return {
              audioBlob: result.audioBlob,
              format: result.format,
              duration: result.duration,
            }
          },
          enjoy: async (req) => {
            const result = await synthesizeWithEnjoy(
              req.text,
              req.language,
              req.voice,
              req.signal
            )
            if (!result.success || !result.data) {
              throw new Error(result.error?.message || 'Enjoy API TTS failed')
            }
            return result.data
          },
          byok: async (req, byokConfig) => {
            const result = await synthesizeWithBYOK(
              req.text,
              req.language,
              req.voice,
              byokConfig,
              req.signal
            )
            if (!result.success || !result.data) {
              throw new Error(result.error?.message || 'BYOK TTS failed')
            }
            return result.data
          },
          byokAzure: async (req, azureConfig) => {
            const result = await byokAzureSpeechService.synthesize(
              req.text,
              req.language,
              req.voice,
              azureConfig,
              req.signal
            )
            return result
          },
        },
      })

      return createSuccessResponse(response, AIServiceType.TTS, provider)
    } catch (error) {
      return handleProviderError(
        error,
        ERROR_TTS_AZURE,
        AIServiceType.TTS,
        AIProvider.ENJOY
      )
    }
  },
}
