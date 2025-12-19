/**
 * Enjoy AI Client
 * Unified client for Enjoy API services (OpenAI-compatible endpoints)
 *
 * Design:
 * - Uses OpenAI SDK for OpenAI-compatible endpoints (chat, audio)
 * - Uses Vercel AI SDK for LLM text generation (consistent with BYOK)
 * - Uses custom fetch for non-standard endpoints (translations)
 * - Single authentication point via Bearer token
 *
 * Server Endpoints:
 * - OpenAI-compatible:
 *   - GET  /api/models              - List available models
 *   - POST /api/chat/completions    - Chat completions (streaming supported)
 *   - POST /api/audio/transcriptions - Speech-to-text (Whisper)
 * - Non-standard:
 *   - POST /api/translations        - Cloudflare Workers AI m2m100 translation
 *
 * Note: TTS and Assessment use Azure Speech SDK (see azure/ folder)
 */

import OpenAI from 'openai'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { useAuthStore } from '@/page/stores/auth'
import { DEFAULT_WORKERS_AI_TEXT_MODEL } from '@/shared/constants'

// Base URL for the Hono API Worker
// Use relative path, but ensure it's properly handled by OpenAI SDK
// OpenAI SDK will construct full URL using window.location.origin if needed
const ENJOY_API_BASE_URL = typeof window !== 'undefined'
  ? `${window.location.origin}/api`
  : '/api'

/**
 * Translation request parameters
 */
export interface TranslationParams {
  text: string
  sourceLang?: string
  targetLang: string
  signal?: AbortSignal
}

/**
 * Translation response
 */
export interface TranslationResult {
  translatedText: string
}

/**
 * LLM generation parameters
 */
export interface LLMGenerationParams {
  prompt: string
  systemPrompt?: string
  model?: string
  signal?: AbortSignal
}

/**
 * Create authenticated fetch function
 * Injects Bearer token from auth store into all requests
 */
function createAuthenticatedFetch(): typeof fetch {
  return async (url: RequestInfo | URL, init?: RequestInit) => {
    const token = useAuthStore.getState().token
    const headers = new Headers(init?.headers)

    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }

    return fetch(url, { ...init, headers })
  }
}

/**
 * Enjoy AI Client Class
 * Provides unified access to all Enjoy API services (OpenAI-compatible)
 */
export class EnjoyAIClient {
  private openaiClient: OpenAI
  private vercelAIProvider: ReturnType<typeof createOpenAI>
  private baseUrl: string
  private authenticatedFetch: typeof fetch

  constructor(options?: { baseUrl?: string }) {
    this.baseUrl = options?.baseUrl || ENJOY_API_BASE_URL
    this.authenticatedFetch = createAuthenticatedFetch()

    // Initialize OpenAI SDK for audio services
    // Note: apiKey is placeholder since auth is via Bearer token
    this.openaiClient = new OpenAI({
      apiKey: 'enjoy-ai-placeholder',
      baseURL: this.baseUrl,
      dangerouslyAllowBrowser: true,
      fetch: this.authenticatedFetch,
    })

    // Initialize Vercel AI SDK provider for LLM services
    // This is consistent with BYOK implementation
    this.vercelAIProvider = createOpenAI({
      apiKey: 'enjoy-ai-placeholder',
      baseURL: this.baseUrl,
      fetch: this.authenticatedFetch,
    })
  }

  // ============================================
  // OpenAI-Compatible Services (via OpenAI SDK)
  // ============================================

  /**
   * Get OpenAI client for direct access to compatible endpoints
   * Use this for low-level control over chat completions and audio services
   */
  get openai(): OpenAI {
    return this.openaiClient
  }

  /**
   * Get Vercel AI SDK provider for text generation
   * Use this for high-level LLM operations (consistent with BYOK)
   */
  get provider(): ReturnType<typeof createOpenAI> {
    return this.vercelAIProvider
  }

  // ============================================
  // LLM Services (via Vercel AI SDK)
  // ============================================

  /**
   * Generate text using LLM
   * Uses Vercel AI SDK for consistency with BYOK implementation
   *
   * @param params - Generation parameters
   * @returns Generated text
   */
  async generateText(params: LLMGenerationParams): Promise<string> {
    const { prompt, systemPrompt, model, signal } = params

    // Use Cloudflare Workers AI model or default
    const modelName = model || DEFAULT_WORKERS_AI_TEXT_MODEL

    const result = await generateText({
      model: this.vercelAIProvider(modelName),
      system: systemPrompt,
      prompt,
      abortSignal: signal,
    })

    return result.text
  }

  // ============================================
  // Audio Services (via OpenAI SDK)
  // ============================================

  /**
   * Speech-to-Text transcription
   * Uses OpenAI-compatible Whisper endpoint
   *
   * @param audioBlob - Audio data to transcribe
   * @param options - ASR options (language, prompt, model, responseFormat)
   * @returns Transcription result
   */
  async transcribeSpeech(
    audioBlob: Blob,
    options?: {
      language?: string
      prompt?: string
      model?: string
      responseFormat?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt'
    }
  ): Promise<any> {
    const audioFile = new File([audioBlob], 'audio.wav', {
      type: audioBlob.type || 'audio/wav',
    })

    // Use OpenAI SDK to create the request, but intercept the response
    // to get the full Cloudflare result (our backend returns full data)
    const formData = new FormData()
    formData.append('file', audioFile)
    formData.append('model', options?.model || 'whisper-1')
    if (options?.language) {
      formData.append('language', options.language)
    }
    if (options?.prompt) {
      formData.append('prompt', options.prompt)
    }
    formData.append('response_format', options?.responseFormat || 'json')

    // Use authenticated fetch to get the raw response
    const response = await this.authenticatedFetch(`${this.baseUrl}/audio/transcriptions`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error((error as any).error || `Transcription failed: ${response.status}`)
    }

    // Parse the full JSON response (our backend returns complete Cloudflare result)
    const result = await response.json()
    return result
  }

  // ============================================
  // Non-Standard Services (custom implementation)
  // ============================================

  /**
   * Fast translation using Cloudflare Workers AI m2m100
   * Non-standard endpoint - not OpenAI-compatible
   *
   * @param params - Translation parameters
   * @returns Translation result
   */
  async translate(params: TranslationParams): Promise<TranslationResult> {
    const { text, sourceLang = 'english', targetLang, signal } = params

    const response = await this.authenticatedFetch(
      `${this.baseUrl}/translations`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          source_lang: sourceLang,
          target_lang: targetLang,
        }),
        signal,
      }
    )

    if (!response.ok) {
      const error = (await response.json().catch(() => ({}))) as {
        error?: string
      }
      throw new Error(error.error || `Translation failed: ${response.status}`)
    }

    const data = (await response.json()) as { translated_text: string }
    return { translatedText: data.translated_text }
  }

  // ============================================
  // Model Information
  // ============================================

  /**
   * List available models
   * Uses OpenAI-compatible models endpoint
   */
  async listModels() {
    return this.openaiClient.models.list()
  }
}

// ============================================
// Singleton Instance
// ============================================

let enjoyClientInstance: EnjoyAIClient | null = null

/**
 * Get Enjoy AI Client singleton instance
 * Use this for most cases to avoid creating multiple instances
 */
export function getEnjoyClient(): EnjoyAIClient {
  if (!enjoyClientInstance) {
    enjoyClientInstance = new EnjoyAIClient()
  }
  return enjoyClientInstance
}

/**
 * Create a new Enjoy AI Client instance
 * Use this if you need custom configuration
 */
export function createEnjoyClient(options?: {
  baseUrl?: string
}): EnjoyAIClient {
  return new EnjoyAIClient(options)
}
