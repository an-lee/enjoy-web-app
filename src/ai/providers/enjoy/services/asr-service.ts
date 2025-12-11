/**
 * ASR (Automatic Speech Recognition) Service
 * Uses OpenAI-compatible audio transcriptions endpoint (/api/audio/transcriptions)
 *
 * Provides speech-to-text transcription using Whisper model.
 */

import { getEnjoyClient } from '../client'
import type { AIServiceResponse, ASRResponse } from '@/ai/types'
import { AIServiceType, AIProvider } from '@/ai/types'
import { convertToTranscriptFormat } from '@/ai/utils/transcript-segmentation'
import type { RawWordTiming } from '@/ai/utils/transcript-segmentation'

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

    // Request JSON format - our backend always returns full Cloudflare result
    // regardless of response_format parameter
    const result = await client.transcribeSpeech(audioBlob, {
      language,
      prompt,
      model: '@cf/openai/whisper-large-v3-turbo',
      responseFormat: 'json', // Backend returns full result anyway
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

    // Extract all words from segments and convert to RawWordTiming format
    // Use intelligent segmentation instead of Cloudflare's segments
    const allWords: RawWordTiming[] = cloudflareResult.segments
      ? cloudflareResult.segments
          .flatMap((seg) => seg.words || [])
          .map((w) => ({
            text: w.word,
            startTime: w.start, // seconds (convertToTranscriptFormat expects seconds)
            endTime: w.end, // seconds
          }))
      : []

    // Use intelligent segmentation for better follow-along reading
    // This considers pauses, punctuation, word count, and meaning groups
    const detectedLanguage = cloudflareResult.transcription_info?.language || language
    const transcript = convertToTranscriptFormat(
      cloudflareResult.text,
      allWords,
      detectedLanguage
    )

    // Convert TTSTranscript to ASRResponse format
    const timeline = transcript.timeline.map((item) => ({
      text: item.text,
      start: item.start, // Already in milliseconds
      duration: item.duration, // Already in milliseconds
      timeline: item.timeline, // Nested word timeline
    }))

    // Convert segments for backward compatibility (flat format)
    const segments = timeline.map((item) => ({
      text: item.text,
      start: item.start,
      end: item.start + item.duration,
    }))

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

