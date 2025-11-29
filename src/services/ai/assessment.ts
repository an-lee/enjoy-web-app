/**
 * Pronunciation Assessment Service
 * Uses Azure Speech Services
 * Note: Local mode is not supported for pronunciation assessment
 * Future support for BYOK (user-provided Azure keys)
 */

import { apiClient } from '@/lib/api/client'
import { azureSpeechService } from './azure-speech'
import type { AIServiceConfig, AIServiceResponse } from './types'

export interface AssessmentRequest {
  audioBlob: Blob
  referenceText: string
  language: string
  config?: AIServiceConfig
}

export interface AssessmentResponse {
  overallScore: number
  accuracyScore: number
  fluencyScore: number
  prosodyScore: number
  wordResults?: Array<{
    word: string
    accuracyScore: number
    errorType: string
  }>
}

/**
 * Pronunciation Assessment Service
 */
export const assessmentService = {
  /**
   * Assess pronunciation
   * Note: Local mode is not supported - pronunciation assessment requires Azure Speech Services
   */
  async assess(
    request: AssessmentRequest
  ): Promise<AIServiceResponse<AssessmentResponse>> {
    const useBYOK = request.config?.provider === 'byok'

    // If using BYOK, use Azure SDK directly
    if (useBYOK && request.config?.apiKeys?.azure) {
      try {
        const result = await azureSpeechService.assessPronunciationWithKey(
          request.audioBlob,
          request.referenceText,
          request.language,
          request.config.apiKeys.azure
        )
        return {
          success: true,
          data: result,
          metadata: {
            serviceType: 'assessment',
            provider: 'byok',
          },
        }
      } catch (error: any) {
        return {
          success: false,
          error: {
            code: 'ASSESSMENT_ERROR',
            message: error.message,
          },
          metadata: {
            serviceType: 'assessment',
            provider: 'byok',
          },
        }
      }
    }

    // Use Enjoy API (get token or forward directly)
    try {
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
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.response?.data?.error?.code || 'ASSESSMENT_ERROR',
          message: error.response?.data?.error?.message || error.message,
        },
        metadata: {
          serviceType: 'assessment',
          provider: 'enjoy',
        },
      }
    }
  },
}

