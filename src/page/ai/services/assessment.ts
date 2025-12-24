/**
 * Pronunciation Assessment Service
 * Uses Azure Speech Services for phoneme-level pronunciation scoring
 *
 * Provider support:
 * - Enjoy: Azure Speech with token from /api/azure/tokens
 * - BYOK Azure: Azure Speech with user's subscription key
 *
 * Note: Local mode is not supported for assessment (requires Azure Speech)
 */

import { assessWithBYOKAzure } from '../providers/byok'
import { assessWithEnjoy } from '../providers/enjoy'
import type {
  AIServiceConfig,
  AIServiceResponse,
  AssessmentResponse,
} from '../types'
import { AIServiceType, AIProvider, BYOKProvider } from '../types'
import {
  ERROR_ASSESSMENT,
  ERROR_ASSESSMENT_BYOK_PROVIDER_NOT_SUPPORTED,
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
  /**
   * Duration of the audio in milliseconds (for usage tracking)
   * If not provided, a default value will be used
   */
  durationMs?: number
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
        if (request.config.byok.provider === BYOKProvider.AZURE && request.config.byok.region) {
          const result = await assessWithBYOKAzure(
            request.audioBlob,
            request.referenceText,
            request.language,
            {
              subscriptionKey: request.config.byok.apiKey,
              region: request.config.byok.region,
            }
          )

          if (!result.success || !result.data) {
            throw new Error(result.error?.message || 'BYOK Azure assessment failed')
          }

          return createSuccessResponse(result.data, AIServiceType.ASSESSMENT, AIProvider.BYOK)
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

      // Enjoy API mode (default) - uses Azure Speech with token
      const result = await assessWithEnjoy(
        request.audioBlob,
        request.referenceText,
        request.language,
        request.durationMs
      )

      if (!result.success || !result.data) {
        throw new Error(result.error?.message || 'Enjoy API assessment failed')
      }

      return result
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
