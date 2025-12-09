/**
 * Unified Error Handler
 * Provides consistent error handling across all AI services
 */

import type { AIServiceResponse, AIServiceType, AIProvider } from '../types'
import { getErrorMessage } from '../constants'

/**
 * Create a success response
 */
export function createSuccessResponse<T>(
  data: T,
  serviceType: AIServiceType,
  provider: AIProvider,
  metadata?: {
    tokensUsed?: number
    cost?: number
  }
): AIServiceResponse<T> {
  return {
    success: true,
    data,
    metadata: {
      serviceType,
      provider,
      ...metadata,
    },
  }
}

/**
 * Create an error response
 */
export function createErrorResponse<T>(
  errorCode: string,
  errorMessage?: string,
  serviceType?: AIServiceType,
  provider?: AIProvider,
  details?: unknown
): AIServiceResponse<T> {
  return {
    success: false,
    error: {
      code: errorCode,
      message: errorMessage || getErrorMessage(errorCode),
      details,
    },
    ...(serviceType &&
      provider && {
        metadata: {
          serviceType,
          provider,
        },
      }),
  }
}

/**
 * Wrap async service call with error handling
 */
export async function withErrorHandling<T>(
  serviceCall: () => Promise<T>,
  errorCode: string,
  serviceType: AIServiceType,
  provider: AIProvider,
  fallbackMessage?: string
): Promise<AIServiceResponse<T>> {
  try {
    const data = await serviceCall()
    return createSuccessResponse(data, serviceType, provider)
  } catch (error: any) {
    return createErrorResponse(
      errorCode,
      error?.message || fallbackMessage,
      serviceType,
      provider,
      error
    )
  }
}

/**
 * Handle provider-specific errors
 */
export function handleProviderError<T>(
  error: unknown,
  errorCode: string,
  serviceType: AIServiceType,
  provider: AIProvider,
  fallbackMessage?: string
): AIServiceResponse<T> {
  const errorMessage =
    (error as any)?.response?.data?.error?.message ||
    (error as any)?.message ||
    fallbackMessage ||
    getErrorMessage(errorCode)

  const finalErrorCode =
    (error as any)?.response?.data?.error?.code || errorCode

  return createErrorResponse(
    finalErrorCode,
    errorMessage,
    serviceType,
    provider,
    error
  )
}

