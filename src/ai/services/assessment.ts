/**
 * Pronunciation Assessment Service
 * Uses Azure Speech Services for phoneme-level pronunciation scoring
 */

import { apiClient } from '@/api/client'
import { azureSpeechService } from '../providers/enjoy/azure-speech'
import type {
  AIServiceConfig,
  AIServiceResponse,
  AssessmentResponse,
} from '../types'
import { AIServiceType, AIProvider, BYOKProvider } from '../types'
import {
  ERROR_ASSESSMENT,
  ERROR_ASSESSMENT_BYOK_PROVIDER_NOT_SUPPORTED,
  DEFAULT_AZURE_REGION,
} from '../constants'
import {
  createSuccessResponse,
  handleProviderError,
} from '../core/error-handler'

export interface AssessmentRequest {
  audioBlob: Blob
  referenceText: string
  language: string
  config?: AIServiceConfig
}

/**
 * Pronunciation Assessment Service
 */
export const assessmentService = {
  /**
   * Assess pronunciation
   */
  async assess(
    request: AssessmentRequest
  ): Promise<AIServiceResponse<AssessmentResponse>> {
    try {
      const useBYOK = request.config?.provider === AIProvider.BYOK

      // BYOK mode with Azure
      if (useBYOK && request.config?.byok) {
        if (request.config.byok.provider === BYOKProvider.AZURE) {
          const result = await azureSpeechService.assessPronunciationWithKey(
            request.audioBlob,
            request.referenceText,
            request.language,
            {
              subscriptionKey: request.config.byok.apiKey,
              region: request.config.byok.region || DEFAULT_AZURE_REGION,
            }
          )
          return createSuccessResponse(result, AIServiceType.ASSESSMENT, AIProvider.BYOK)
        }

        // Only Azure supports pronunciation assessment
        return handleProviderError(
          new Error(
            `Provider ${request.config.byok.provider} does not support pronunciation assessment. Only Azure Speech is supported.`
          ),
          ERROR_ASSESSMENT_BYOK_PROVIDER_NOT_SUPPORTED,
          AIServiceType.ASSESSMENT,
          AIProvider.BYOK
        )
      }

      // Enjoy API mode (default)
      const formData = new FormData()
      formData.append('audio', request.audioBlob, 'recording.wav')
      formData.append('referenceText', request.referenceText)
      formData.append('language', request.language)

      const response = await apiClient.post<
        AIServiceResponse<AssessmentResponse>
      >('/api/v1/services/assessment', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      return response.data
    } catch (error) {
      return handleProviderError(
        error,
        ERROR_ASSESSMENT,
        AIServiceType.ASSESSMENT,
        AIProvider.ENJOY
      )
    }
  },
}
