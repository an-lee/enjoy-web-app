/**
 * Azure Speech TTS Service (BYOK)
 * Uses Azure Speech SDK with user-provided subscription key
 *
 * This is for users who have their own Azure Speech subscription.
 * For Enjoy API users, see ../../enjoy/azure/ which uses tokens from the server.
 * Supports word-level timestamps via word boundary events for transcript generation.
 */

import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk'
import type {
  AIServiceResponse,
  TTSResponse,
} from '../../../types'
import { AIServiceType, AIProvider } from '../../../types'
import type { AzureSpeechConfig } from './types'
import {
  convertToTranscriptFormat,
  type RawWordTiming,
} from '../../../utils/transcript-segmentation'

/**
 * Azure word timing data (internal use)
 * Will be converted to RawWordTiming format for segmentation
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
 * Synthesize speech using user-provided Azure subscription key
 * Captures word boundary events for transcript generation
 *
 * @param text - Text to synthesize
 * @param language - Language code for synthesis
 * @param voice - Optional voice name override
 * @param config - Azure subscription key and region
 * @param signal - AbortSignal for cancellation
 * @returns TTS response with audio blob and word-level transcript
 */
export async function synthesize(
  text: string,
  language: string,
  voice: string | undefined,
  config: AzureSpeechConfig,
  signal?: AbortSignal
): Promise<AIServiceResponse<TTSResponse>> {
  let synthesizer: SpeechSDK.SpeechSynthesizer | null = null

  try {
    const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(
      config.subscriptionKey,
      config.region
    )

    // Set output format to MP3
    speechConfig.speechSynthesisOutputFormat =
      SpeechSDK.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3

    // Set voice
    speechConfig.speechSynthesisVoiceName = getVoiceForLanguage(language, voice)

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
      // Duration is in 100-nanosecond units
      const durationSeconds = event.duration / 10000000

      wordBoundaries.push({
        text: event.text,
        startTime: startTimeSeconds,
        endTime: startTimeSeconds + durationSeconds,
      })
    }

    if (signal?.aborted) {
      throw new Error('Request was cancelled')
    }

    const result = await new Promise<SpeechSDK.SpeechSynthesisResult>(
      (resolve, reject) => {
        const abortHandler = () => {
          synthesizer?.close()
          reject(new Error('Request was cancelled'))
        }

        if (signal) {
          signal.addEventListener('abort', abortHandler)
        }

        synthesizer!.speakTextAsync(
          text,
          (result: SpeechSDK.SpeechSynthesisResult) => {
            if (signal) signal.removeEventListener('abort', abortHandler)
            resolve(result)
          },
          (error: string) => {
            if (signal) signal.removeEventListener('abort', abortHandler)
            reject(new Error(error))
          }
        )
      }
    )

    if (result.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
      const audioBlob = new Blob([result.audioData], { type: 'audio/mpeg' })
      const duration = result.audioData.byteLength / 4000

      // Build transcript from word boundaries in TranscriptLine format
      // Convert AzureWordTiming to RawWordTiming format
      const rawTimings: RawWordTiming[] = wordBoundaries.map((w) => ({
        text: w.text,
        startTime: w.startTime,
        endTime: w.endTime,
      }))

      const transcript = rawTimings.length > 0
        ? convertToTranscriptFormat(text, rawTimings, language)
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
          provider: AIProvider.BYOK,
        },
      }
    } else {
      const errorDetails = SpeechSDK.CancellationDetails.fromResult(result as any)
      throw new Error(`TTS failed: ${errorDetails.errorDetails}`)
    }
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: 'BYOK_AZURE_TTS_ERROR',
        message: error.message || 'Azure Speech TTS failed',
      },
      metadata: {
        serviceType: AIServiceType.TTS,
        provider: AIProvider.BYOK,
      },
    }
  } finally {
    if (synthesizer) synthesizer.close()
  }
}


