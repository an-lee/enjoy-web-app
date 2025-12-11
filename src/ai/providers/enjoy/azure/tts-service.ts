/**
 * Azure Speech TTS Service
 * Uses Azure Speech SDK with token from /api/azure/tokens
 *
 * This provides high-quality text-to-speech using Azure Neural Voices.
 * Supports word-level timestamps via word boundary events for transcript generation.
 */

import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk'
import { getAzureToken } from './token-manager'
import type {
  AIServiceResponse,
  TTSResponse,
} from '../../../types'
import { AIServiceType, AIProvider } from '../../../types'
import {
  convertToTranscriptFormat,
  type RawWordTiming,
} from '../../../utils/transcript-segmentation'

/**
 * Raw word timing data from Azure word boundary events (internal use)
 */
interface AzureWordTiming {
  text: string
  startTime: number // seconds
  endTime: number // seconds
}

/**
 * Voice mapping for different languages
 * Maps language codes to Azure Neural Voice names
 */
const VOICE_MAP: Record<string, string> = {
  'en': 'en-US-JennyNeural',
  'en-US': 'en-US-JennyNeural',
  'en-GB': 'en-GB-SoniaNeural',
  'zh': 'zh-CN-XiaoxiaoNeural',
  'zh-CN': 'zh-CN-XiaoxiaoNeural',
  'zh-TW': 'zh-TW-HsiaoChenNeural',
  'ja': 'ja-JP-NanamiNeural',
  'ko': 'ko-KR-SunHiNeural',
  'es': 'es-ES-ElviraNeural',
  'fr': 'fr-FR-DeniseNeural',
  'de': 'de-DE-KatjaNeural',
  'pt': 'pt-BR-FranciscaNeural',
  'pt-BR': 'pt-BR-FranciscaNeural',
  'pt-PT': 'pt-PT-RaquelNeural',
}

/**
 * Get voice name for language
 */
function getVoiceForLanguage(language: string, preferredVoice?: string): string {
  if (preferredVoice) {
    return preferredVoice
  }

  const baseLanguage = language.split('-')[0].toLowerCase()
  return VOICE_MAP[language] || VOICE_MAP[baseLanguage] || 'en-US-JennyNeural'
}

/**
 * Synthesize speech using Azure Speech SDK
 * Captures word boundary events for transcript generation
 *
 * @param text - Text to synthesize
 * @param language - Language code for synthesis
 * @param voice - Optional voice name override
 * @param signal - AbortSignal for cancellation
 * @returns TTS response with audio blob and word-level transcript
 */
export async function synthesize(
  text: string,
  language: string,
  voice?: string,
  signal?: AbortSignal
): Promise<AIServiceResponse<TTSResponse>> {
  let synthesizer: SpeechSDK.SpeechSynthesizer | null = null

  try {
    // Get Azure token
    const { token, region } = await getAzureToken()

    // Create speech config with auth token
    const speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(
      token,
      region
    )

    // Set output format to MP3 for smaller file size
    speechConfig.speechSynthesisOutputFormat =
      SpeechSDK.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3

    // Set voice
    const voiceName = getVoiceForLanguage(language, voice)
    speechConfig.speechSynthesisVoiceName = voiceName

    // Create synthesizer (null audio config for pull stream)
    synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig)

    // Collect word boundary events for transcript
    const wordBoundaries: AzureWordTiming[] = []

    // Subscribe to word boundary events
    synthesizer.wordBoundary = (
      _sender: SpeechSDK.SpeechSynthesizer,
      event: SpeechSDK.SpeechSynthesisWordBoundaryEventArgs
    ) => {
      // Azure returns time in 100-nanosecond units (ticks)
      // Convert to seconds: ticks / 10,000,000
      const startTimeSeconds = Number(event.audioOffset) / 10000000
      // Duration is in milliseconds in some versions, check the actual value
      const durationSeconds = event.duration / 10000000

      wordBoundaries.push({
        text: event.text,
        startTime: startTimeSeconds,
        endTime: startTimeSeconds + durationSeconds,
      })
    }

    // Handle abort signal
    if (signal?.aborted) {
      throw new Error('Request was cancelled')
    }

    // Synthesize speech
    const result = await new Promise<SpeechSDK.SpeechSynthesisResult>(
      (resolve, reject) => {
        // Set up abort handler
        const abortHandler = () => {
          synthesizer?.close()
          reject(new Error('Request was cancelled'))
        }

        if (signal) {
          signal.addEventListener('abort', abortHandler)
        }

        synthesizer!.speakTextAsync(
          text,
          (result) => {
            if (signal) {
              signal.removeEventListener('abort', abortHandler)
            }
            resolve(result)
          },
          (error) => {
            if (signal) {
              signal.removeEventListener('abort', abortHandler)
            }
            reject(new Error(error))
          }
        )
      }
    )

    // Check result
    if (result.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
      const audioData = result.audioData
      const audioBlob = new Blob([audioData], { type: 'audio/mpeg' })

      // Calculate approximate duration (based on audio data size and bitrate)
      // 32kbps = 4000 bytes/second
      const duration = audioData.byteLength / 4000

      // Build transcript from word boundaries in TranscriptLine format
      // Convert AzureWordTiming to RawWordTiming format
      const rawTimings: RawWordTiming[] = wordBoundaries.map((w) => ({
        text: w.text,
        startTime: w.startTime,
        endTime: w.endTime,
      }))

      const transcript = rawTimings.length > 0
        ? convertToTranscriptFormat(text, rawTimings)
        : undefined

      return {
        success: true,
        data: {
          audioBlob,
          format: 'audio/mpeg',
          duration,
          transcript,
        },
        metadata: {
          serviceType: AIServiceType.TTS,
          provider: AIProvider.ENJOY,
        },
      }
    } else {
      const errorDetails = SpeechSDK.CancellationDetails.fromResult(result as any)
      throw new Error(
        `Speech synthesis failed: ${errorDetails.reason} - ${errorDetails.errorDetails}`
      )
    }
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: 'ENJOY_TTS_ERROR',
        message: error.message || 'Azure Speech TTS failed',
      },
      metadata: {
        serviceType: AIServiceType.TTS,
        provider: AIProvider.ENJOY,
      },
    }
  } finally {
    // Clean up synthesizer
    if (synthesizer) {
      synthesizer.close()
    }
  }
}


