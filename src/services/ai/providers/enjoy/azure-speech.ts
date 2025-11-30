/**
 * Azure Speech Service Wrapper
 * Supports getting tokens from Enjoy API, also supports direct use of user keys (BYOK)
 */

import { apiClient } from '@/services/api/client'

export interface AzureSpeechConfig {
  subscriptionKey: string
  region: string
}

export interface PronunciationAssessmentResult {
  overallScore: number // 0-100
  accuracyScore: number
  fluencyScore: number
  prosodyScore: number
  wordResults?: Array<{
    word: string
    accuracyScore: number
    errorType: string
  }>
}

export interface ASRResult {
  text: string
  segments?: Array<{
    text: string
    start: number
    end: number
  }>
  language?: string
}

/**
 * Azure Speech Service Wrapper
 */
export const azureSpeechService = {
  /**
   * Get Azure Speech token from Enjoy API
   */
  async getToken(): Promise<string> {
    const response = await apiClient.get<{ token: string; expiresAt: number }>(
      '/api/v1/services/azure-speech/token'
    )
    return response.data.token
  },

  /**
   * Synthesize speech using token from Enjoy API
   */
  async synthesizeWithToken(
    _text: string,
    _language: string,
    _voice?: string,
    token?: string
  ): Promise<Blob> {
    // Get token if not provided (will be used in implementation)
    void (token || this.getToken())

    // TODO: Implement using Azure Speech SDK
    // Install: bun add microsoft-cognitiveservices-speech-sdk
    // import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk'

    throw new Error('Not implemented: Azure Speech SDK TTS integration needed')
  },

  /**
   * Synthesize speech using user-provided key (BYOK)
   */
  async synthesizeWithKey(
    _text: string,
    _language: string,
    _voice: string | undefined,
    _config: AzureSpeechConfig
  ): Promise<Blob> {
    // TODO: Call Azure Speech SDK directly with user-provided key
    // Bypass Enjoy API

    throw new Error('Not implemented: Azure Speech SDK TTS integration needed')
  },

  /**
   * Assess pronunciation using token from Enjoy API
   */
  async assessPronunciationWithToken(
    _audioBlob: Blob,
    _referenceText: string,
    _language: string,
    token?: string
  ): Promise<PronunciationAssessmentResult> {
    // Get token if not provided (will be used in implementation)
    void (token || this.getToken())

    // TODO: Implement using Azure Speech SDK

    throw new Error('Not implemented: Azure Speech SDK assessment integration needed')
  },

  /**
   * Assess pronunciation using user-provided key (BYOK)
   */
  async assessPronunciationWithKey(
    _audioBlob: Blob,
    _referenceText: string,
    _language: string,
    _config: AzureSpeechConfig
  ): Promise<PronunciationAssessmentResult> {
    // TODO: Call Azure Speech SDK directly with user-provided key

    throw new Error('Not implemented: Azure Speech SDK assessment integration needed')
  },

  /**
   * Transcribe speech using token from Enjoy API
   */
  async transcribeWithToken(
    _audioBlob: Blob,
    _language: string | undefined,
    token?: string
  ): Promise<ASRResult> {
    // Get token if not provided (will be used in implementation)
    void (token || this.getToken())

    // TODO: Implement using Azure Speech SDK

    throw new Error('Not implemented: Azure Speech SDK ASR integration needed')
  },

  /**
   * Transcribe speech using user-provided key (BYOK)
   */
  async transcribeWithKey(
    _audioBlob: Blob,
    _language: string | undefined,
    _config: AzureSpeechConfig
  ): Promise<ASRResult> {
    // TODO: Call Azure Speech SDK directly with user-provided key

    throw new Error('Not implemented: Azure Speech SDK ASR integration needed')
  },
}

