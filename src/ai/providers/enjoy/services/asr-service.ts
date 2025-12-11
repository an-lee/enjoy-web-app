/**
 * ASR (Automatic Speech Recognition) Service
 * Uses OpenAI-compatible audio transcriptions endpoint (/api/audio/transcriptions)
 *
 * Provides speech-to-text transcription using Whisper model.
 */

import { getEnjoyClient } from '../client'
import type { AIServiceResponse, ASRResponse } from '@/ai/types'
import { AIServiceType, AIProvider } from '@/ai/types'

/**
 * Transcribe speech to text
 * Uses OpenAI-compatible Whisper API
 *
 * @param audioBlob - Audio data to transcribe
 * @param language - Target language code for transcription
 * @param prompt - Context prompt to improve transcription accuracy
 * @returns ASR response with transcribed text
 */
export async function transcribe(
  audioBlob: Blob,
  language?: string,
  prompt?: string
): Promise<AIServiceResponse<ASRResponse>> {
  try {
    const client = getEnjoyClient()

    // Request JSON format to get all Cloudflare data
    const result = await client.transcribeSpeech(audioBlob, {
      language,
      prompt,
      model: '@cf/openai/whisper-large-v3-turbo',
      responseFormat: 'json', // Get raw Cloudflare result
    })

    // Cloudflare returns data with timestamps in seconds
    // According to Cloudflare docs, words are inside segments[].words, not at top level
    // Convert to transcript format (milliseconds)
    type CloudflareResult = {
      text: string
      word_count?: number
      segments?: Array<{
        start: number // seconds
        end: number // seconds
        text: string
        temperature?: number
        avg_logprob?: number
        compression_ratio?: number
        no_speech_prob?: number
        words?: Array<{
          word: string
          start: number // seconds
          end: number // seconds
        }>
      }>
      transcription_info?: {
        language?: string
        language_probability?: number
        duration?: number
        duration_after_vad?: number
      }
      vtt?: string
    }

    const cloudflareResult = result as CloudflareResult

    // Convert segments to timeline format
    // segments are the main timeline, words are nested timeline within each segment
    const timeline = cloudflareResult.segments
      ? cloudflareResult.segments.map((seg) => {
          // Convert segment times from seconds to milliseconds
          const start = Math.round(seg.start * 1000)
          const end = Math.round(seg.end * 1000)
          const duration = end - start

          // Convert words to nested timeline if available
          const wordTimeline = seg.words
            ? seg.words.map((w) => ({
                text: w.word,
                start: Math.round(w.start * 1000), // Convert seconds to milliseconds
                duration: Math.round((w.end - w.start) * 1000), // Convert seconds to milliseconds
              }))
            : undefined

          return {
            text: seg.text || '',
            start,
            duration,
            timeline: wordTimeline, // Nested timeline for words
          }
        })
      : undefined

    // Convert segments for backward compatibility (flat format)
    const segments = cloudflareResult.segments
      ? cloudflareResult.segments.map((seg) => ({
          text: seg.text || '',
          start: Math.round(seg.start * 1000), // Convert seconds to milliseconds
          end: Math.round(seg.end * 1000), // Convert seconds to milliseconds
        }))
      : undefined

    return {
      success: true,
      data: {
        text: cloudflareResult.text,
        segments,
        timeline,
        language: cloudflareResult.transcription_info?.language,
        duration: cloudflareResult.transcription_info?.duration,
      },
      metadata: {
        serviceType: AIServiceType.ASR,
        provider: AIProvider.ENJOY,
      },
    }
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: 'ENJOY_ASR_ERROR',
        message: error.message || 'Enjoy API ASR failed',
      },
      metadata: {
        serviceType: AIServiceType.ASR,
        provider: AIProvider.ENJOY,
      },
    }
  }
}

