/**
 * Provider Router
 * Unified routing layer for all AI service providers
 */

import type {
  AIServiceConfig,
  AIServiceType,
  AIProvider,
} from '../types'
import { AIProvider as AIProviderEnum, BYOKProvider as BYOKProviderEnum } from '../types'
import { mergeAIServiceConfig } from './config'

/**
 * Provider handlers
 */
export interface ProviderHandlers<TRequest, TResponse> {
  local?: (request: TRequest, config?: AIServiceConfig) => Promise<TResponse>
  enjoy?: (request: TRequest, config?: AIServiceConfig) => Promise<TResponse>
  byok?: (
    request: TRequest,
    byokConfig: NonNullable<AIServiceConfig['byok']>
  ) => Promise<TResponse>
  byokAzure?: (
    request: TRequest,
    azureConfig: {
      subscriptionKey: string
      region: string
    }
  ) => Promise<TResponse>
}

/**
 * Route request to appropriate provider
 */
export async function routeToProvider<TRequest, TResponse>(options: {
  serviceType: AIServiceType
  request: TRequest
  config?: AIServiceConfig
  handlers: ProviderHandlers<TRequest, TResponse>
}): Promise<{
  response: TResponse
  provider: AIProvider
}> {
  const { serviceType, request, config: userConfig, handlers } = options

  // Merge user config with defaults
  const config = mergeAIServiceConfig(userConfig, serviceType)
  const provider = config.provider

  // Route to local provider
  if (provider === AIProviderEnum.LOCAL) {
    if (!handlers.local) {
      throw new Error(`Local provider not supported for ${serviceType}`)
    }
    const response = await handlers.local(request, config)
    return { response, provider }
  }

  // Route to BYOK provider
  if (provider === AIProviderEnum.BYOK) {
    if (!config.byok) {
      throw new Error('BYOK configuration is required when provider is "byok"')
    }

    // Special handling for Azure (BYOK Azure)
    if (
      config.byok.provider === BYOKProviderEnum.AZURE &&
      handlers.byokAzure
    ) {
      const response = await handlers.byokAzure(request, {
        subscriptionKey: config.byok.apiKey,
        region: config.byok.region || 'eastus',
      })
      return { response, provider }
    }

    // Check if BYOK provider is supported
    if (!handlers.byok) {
      throw new Error(
        `BYOK provider ${config.byok.provider} is not supported for ${serviceType}`
      )
    }

    const response = await handlers.byok(request, config.byok)
    return { response, provider }
  }

  // Route to Enjoy API (default)
  if (!handlers.enjoy) {
    throw new Error(`Enjoy API handler not implemented for ${serviceType}`)
  }

  const response = await handlers.enjoy(request, config)
  return { response, provider: AIProviderEnum.ENJOY }
}

