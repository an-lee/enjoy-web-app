/**
 * BYOK AI Client
 * Unified client for Bring Your Own Key (BYOK) services
 *
 * Design:
 * - Uses Vercel AI SDK for LLM text generation (supports multiple providers)
 * - Uses OpenAI SDK for audio services (Whisper, TTS)
 * - Supports: OpenAI, Claude, Google, Azure OpenAI, Custom endpoints
 *
 * Note: Azure Speech services use separate SDK (see azure/ folder)
 */

import OpenAI from 'openai'
import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateText } from 'ai'
import type { BYOKConfig } from '../../types'

/**
 * BYOK LLM generation parameters
 */
export interface BYOKLLMGenerationParams {
  prompt: string
  systemPrompt?: string
  model?: string
  signal?: AbortSignal
}

/**
 * Get Vercel AI SDK provider based on BYOK config
 */
function getVercelAIProvider(config: BYOKConfig) {
  switch (config.provider) {
    case 'openai':
      return createOpenAI({ apiKey: config.apiKey })
    case 'claude':
      return createAnthropic({ apiKey: config.apiKey })
    case 'google':
      return createGoogleGenerativeAI({ apiKey: config.apiKey })
    case 'azure':
      return createOpenAI({
        apiKey: config.apiKey,
        baseURL: config.endpoint,
      })
    case 'custom':
      return createOpenAI({
        apiKey: config.apiKey,
        baseURL: config.endpoint,
      })
    default:
      throw new Error(`Provider ${config.provider} not supported for LLM services`)
  }
}

/**
 * Get default model for provider
 */
function getDefaultModel(config: BYOKConfig): string {
  switch (config.provider) {
    case 'openai':
      return 'gpt-4'
    case 'claude':
      return 'claude-3-sonnet-20240229'
    case 'google':
      return 'gemini-pro'
    case 'azure':
    case 'custom':
      return config.model || 'gpt-4'
    default:
      return 'gpt-4'
  }
}

/**
 * BYOK AI Client Class
 * Provides unified access to user-provided API services
 */
export class BYOKClient {
  private config: BYOKConfig
  private openaiClient: OpenAI | null = null
  private vercelAIProvider: ReturnType<typeof createOpenAI> | ReturnType<typeof createAnthropic> | ReturnType<typeof createGoogleGenerativeAI>

  constructor(config: BYOKConfig) {
    this.config = config
    this.vercelAIProvider = getVercelAIProvider(config)

    // Initialize OpenAI client for audio services (OpenAI/custom providers only)
    if (config.provider === 'openai' || config.provider === 'custom') {
      this.openaiClient = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.endpoint,
        dangerouslyAllowBrowser: true,
      })
    }
  }

  /**
   * Get the BYOK configuration
   */
  get byokConfig(): BYOKConfig {
    return this.config
  }

  /**
   * Check if OpenAI client is available (for audio services)
   */
  get hasOpenAIClient(): boolean {
    return this.openaiClient !== null
  }

  // ============================================
  // LLM Services (via Vercel AI SDK)
  // ============================================

  /**
   * Generate text using LLM
   * Supports OpenAI, Claude, Google, Azure, and custom endpoints
   *
   * @param params - Generation parameters
   * @returns Generated text
   */
  async generateText(params: BYOKLLMGenerationParams): Promise<string> {
    const { prompt, systemPrompt, model, signal } = params

    const modelName = model || this.config.model || getDefaultModel(this.config)

    try {
      const result = await generateText({
        model: this.vercelAIProvider(modelName),
        system: systemPrompt,
        prompt,
        abortSignal: signal,
      })

      return result.text
    } catch (error: any) {
      if (signal?.aborted || error.name === 'AbortError') {
        throw new Error('Request was cancelled')
      }
      throw new Error(`BYOK LLM generation failed: ${error.message || String(error)}`)
    }
  }

  // ============================================
  // Audio Services (via OpenAI SDK)
  // ============================================

  /**
   * Speech-to-Text transcription
   * Uses OpenAI Whisper API (requires OpenAI or custom provider)
   *
   * @param audioBlob - Audio data to transcribe
   * @param options - ASR options (language, prompt)
   * @returns Transcription result
   */
  async transcribeSpeech(
    audioBlob: Blob,
    options?: {
      language?: string
      prompt?: string
      model?: string
    }
  ): Promise<{ text: string }> {
    if (!this.openaiClient) {
      throw new Error(
        `Provider ${this.config.provider} does not support ASR. Use OpenAI or custom endpoint, or use Azure Speech SDK.`
      )
    }

    const audioFile = new File([audioBlob], 'audio.wav', {
      type: audioBlob.type || 'audio/wav',
    })

    const transcription = await this.openaiClient.audio.transcriptions.create({
      file: audioFile,
      model: options?.model || this.config.model || 'whisper-1',
      language: options?.language,
      prompt: options?.prompt,
    })

    return { text: transcription.text }
  }

  /**
   * Text-to-Speech synthesis
   * Uses OpenAI TTS API (requires OpenAI or custom provider)
   *
   * @param text - Text to synthesize
   * @param options - TTS options (voice, model)
   * @returns Audio blob
   */
  async synthesizeSpeech(
    text: string,
    options?: {
      voice?: string
      model?: string
      signal?: AbortSignal
    }
  ): Promise<Blob> {
    if (!this.openaiClient) {
      throw new Error(
        `Provider ${this.config.provider} does not support TTS. Use OpenAI or custom endpoint, or use Azure Speech SDK.`
      )
    }

    const response = await this.openaiClient.audio.speech.create(
      {
        model: options?.model || this.config.model || 'tts-1',
        input: text,
        voice: (options?.voice || 'alloy') as any,
      },
      {
        signal: options?.signal,
      }
    )

    return response.blob()
  }
}

// ============================================
// Factory Function
// ============================================

/**
 * Create a new BYOK AI Client instance
 * Each instance is configured with specific API credentials
 */
export function createBYOKClient(config: BYOKConfig): BYOKClient {
  return new BYOKClient(config)
}

