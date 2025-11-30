/**
 * Provider Adapters
 * Handles API differences between BYOK providers
 * Wraps official SDKs to provide a unified interface
 *
 * Dependencies (install when implementing BYOK):
 * - openai: Official OpenAI SDK
 * - @anthropic-ai/sdk: Official Anthropic SDK
 * - @google/generative-ai: Official Google Generative AI SDK
 * - microsoft-cognitiveservices-speech-sdk: Already installed for Azure Speech
 *
 * Note: This file provides the adapter interface. Actual SDK usage will be
 * implemented in service-specific files when BYOK is developed.
 */

import type { BYOKConfig, BYOKProvider } from './types'

/**
 * Base interface for provider adapters
 *
 * IMPORTANT: When implementing BYOK, prefer using official SDKs over manual API calls.
 * This interface serves as a unified abstraction layer over the official SDKs.
 *
 * Recommended approach:
 * 1. Install official SDK (e.g., 'openai', '@anthropic-ai/sdk')
 * 2. Create service-specific wrapper functions
 * 3. Use provider adapters only for simple format conversions if needed
 */
export interface ProviderAdapter {
  /**
   * Get SDK client instance for the provider
   * Recommended: Return official SDK client instead of manual headers
   */
  getClient?(config: BYOKConfig): any

  /**
   * Prepare request headers for the provider (for REST API calls)
   * Use this only if official SDK is not available or suitable
   */
  getHeaders?(config: BYOKConfig): Record<string, string>

  /**
   * Get the API endpoint for the provider (for REST API calls)
   * Use this only if official SDK is not available or suitable
   */
  getEndpoint?(config: BYOKConfig, service: string): string

  /**
   * Transform request body if needed
   * Most providers follow OpenAI format, but some may need adjustments
   */
  transformRequest?(body: any, config?: BYOKConfig): any

  /**
   * Transform response if needed
   * Converts provider-specific response to OpenAI format
   */
  transformResponse?(response: any): any
}

/**
 * OpenAI Provider Adapter
 * Uses official OpenAI API
 */
class OpenAIAdapter implements ProviderAdapter {
  getHeaders(config: BYOKConfig): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    }
  }

  getEndpoint(config: BYOKConfig, service: string): string {
    const baseUrl = config.endpoint || 'https://api.openai.com/v1'
    return `${baseUrl}/${service}`
  }
}

/**
 * Google (Gemini) Provider Adapter
 * Converts Gemini API to OpenAI format
 */
class GoogleAdapter implements ProviderAdapter {
  getHeaders(_config: BYOKConfig): Record<string, string> {
    return {
      'Content-Type': 'application/json',
    }
  }

  getEndpoint(config: BYOKConfig, service: string): string {
    const baseUrl =
      config.endpoint || 'https://generativelanguage.googleapis.com/v1beta'
    // Gemini uses API key in URL parameter
    return `${baseUrl}/${service}?key=${config.apiKey}`
  }

  transformRequest(body: any, _config?: BYOKConfig): any {
    // Transform OpenAI format to Gemini format
    // This is a simplified example - actual implementation may vary
    if (body.messages) {
      return {
        contents: body.messages.map((msg: any) => ({
          role: msg.role === 'assistant' ? 'model' : msg.role,
          parts: [{ text: msg.content }],
        })),
        generationConfig: {
          temperature: body.temperature,
          maxOutputTokens: body.max_tokens,
        },
      }
    }
    return body
  }

  transformResponse(response: any): any {
    // Transform Gemini response to OpenAI format
    if (response.candidates) {
      return {
        choices: response.candidates.map((candidate: any) => ({
          message: {
            role: 'assistant',
            content: candidate.content.parts[0].text,
          },
        })),
      }
    }
    return response
  }
}

/**
 * Claude (Anthropic) Provider Adapter
 * Converts Claude API to OpenAI format
 */
class ClaudeAdapter implements ProviderAdapter {
  getHeaders(config: BYOKConfig): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
    }
  }

  getEndpoint(config: BYOKConfig, service: string): string {
    const baseUrl = config.endpoint || 'https://api.anthropic.com/v1'
    return `${baseUrl}/${service}`
  }

  transformRequest(body: any, config?: BYOKConfig): any {
    // Transform OpenAI format to Claude format
    if (body.messages) {
      // Claude requires 'model' field and different message format
      return {
        model: config?.model || 'claude-3-sonnet-20240229',
        messages: body.messages,
        max_tokens: body.max_tokens || 1024,
        temperature: body.temperature,
      }
    }
    return body
  }

  transformResponse(response: any): any {
    // Transform Claude response to OpenAI format
    if (response.content) {
      return {
        choices: [
          {
            message: {
              role: 'assistant',
              content:
                typeof response.content === 'string'
                  ? response.content
                  : response.content[0]?.text || '',
            },
          },
        ],
      }
    }
    return response
  }
}

/**
 * Azure OpenAI Provider Adapter
 * Uses Azure OpenAI Service
 */
class AzureAdapter implements ProviderAdapter {
  getHeaders(config: BYOKConfig): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'api-key': config.apiKey,
    }
  }

  getEndpoint(config: BYOKConfig, service: string): string {
    // Azure uses a different URL format: https://{resource}.openai.azure.com/openai/deployments/{deployment-id}/{service}
    // endpoint should be provided in config
    if (!config.endpoint) {
      throw new Error('Azure endpoint is required in BYOK config')
    }
    return `${config.endpoint}/${service}?api-version=2024-02-01`
  }
}

/**
 * Custom OpenAI-Compatible Provider Adapter
 * For any custom endpoint that follows OpenAI API format
 */
class CustomAdapter implements ProviderAdapter {
  getHeaders(config: BYOKConfig): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    }
  }

  getEndpoint(config: BYOKConfig, service: string): string {
    if (!config.endpoint) {
      throw new Error('Custom endpoint is required in BYOK config')
    }
    return `${config.endpoint}/${service}`
  }
}

/**
 * Provider Adapter Registry
 */
const providerAdapters: Record<BYOKProvider, ProviderAdapter> = {
  openai: new OpenAIAdapter(),
  google: new GoogleAdapter(),
  claude: new ClaudeAdapter(),
  azure: new AzureAdapter(),
  custom: new CustomAdapter(),
}

/**
 * Get adapter for a BYOK provider
 */
export function getProviderAdapter(provider: BYOKProvider): ProviderAdapter {
  const adapter = providerAdapters[provider]
  if (!adapter) {
    throw new Error(`Unsupported BYOK provider: ${provider}`)
  }
  return adapter
}

/**
 * Check if a provider is supported for a specific service
 * Not all providers support all services (e.g., only Azure supports pronunciation assessment)
 */
export function isProviderSupported(
  provider: BYOKProvider,
  service: 'asr' | 'tts' | 'translation' | 'dictionary' | 'assessment'
): boolean {
  // Define service support matrix
  const supportMatrix: Record<
    BYOKProvider,
    Partial<Record<typeof service, boolean>>
  > = {
    openai: {
      asr: true,
      tts: true,
      translation: true,
      dictionary: true,
      assessment: false, // OpenAI doesn't support pronunciation assessment
    },
    google: {
      asr: false, // Google Speech is different from Gemini
      tts: false,
      translation: true,
      dictionary: true,
      assessment: false,
    },
    claude: {
      asr: false,
      tts: false,
      translation: true,
      dictionary: true,
      assessment: false,
    },
    azure: {
      asr: true,
      tts: true,
      translation: true,
      dictionary: true,
      assessment: true, // Only Azure supports pronunciation assessment
    },
    custom: {
      // Custom providers may vary, assume basic support
      asr: true,
      tts: true,
      translation: true,
      dictionary: true,
      assessment: false,
    },
  }

  return supportMatrix[provider]?.[service] ?? false
}

