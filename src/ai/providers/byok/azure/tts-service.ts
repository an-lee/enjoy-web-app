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
  TTSTranscript,
  TTSTranscriptItem,
} from '../../../types'
import { AIServiceType, AIProvider } from '../../../types'
import type { AzureSpeechConfig } from './types'

/**
 * Raw word timing data from Azure word boundary events (internal use)
 */
interface RawWordTiming {
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
    const wordBoundaries: RawWordTiming[] = []

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
      const transcript: TTSTranscript | undefined =
        wordBoundaries.length > 0
          ? convertToTranscriptFormat(text, wordBoundaries)
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

/**
 * Convert raw word timings to TranscriptLine format
 * Groups words into sentences (based on punctuation) with nested word timeline
 * All times are converted to milliseconds (integer)
 */
function convertToTranscriptFormat(
  text: string,
  rawTimings: RawWordTiming[]
): TTSTranscript {
  // Split text into sentences using common sentence-ending punctuation
  // Handles: . ! ? and their Unicode variants, including ellipsis
  const sentenceRegex = /[^.!?。！？…]+[.!?。！？…]*/g
  const sentences = text.match(sentenceRegex) || [text]

  // Map words to sentences
  const timeline: TTSTranscriptItem[] = []
  let wordIndex = 0

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim()
    if (!trimmedSentence) continue

    // Get words in this sentence
    const sentenceWords = trimmedSentence
      .split(/\s+/)
      .filter((w) => w.length > 0)
    const sentenceWordTimings: TTSTranscriptItem[] = []

    // Collect word timings for this sentence
    for (
      let i = 0;
      i < sentenceWords.length && wordIndex < rawTimings.length;
      i++
    ) {
      const rawTiming = rawTimings[wordIndex]
      // Convert seconds to milliseconds (integer)
      const startMs = Math.round(rawTiming.startTime * 1000)
      const durationMs = Math.round(
        (rawTiming.endTime - rawTiming.startTime) * 1000
      )

      sentenceWordTimings.push({
        text: rawTiming.text,
        start: startMs,
        duration: durationMs,
      })
      wordIndex++
    }

    // Create sentence item with word timeline
    if (sentenceWordTimings.length > 0) {
      const sentenceStart = sentenceWordTimings[0].start
      const lastWord = sentenceWordTimings[sentenceWordTimings.length - 1]
      const sentenceEnd = lastWord.start + lastWord.duration
      const sentenceDuration = sentenceEnd - sentenceStart

      timeline.push({
        text: trimmedSentence,
        start: sentenceStart,
        duration: sentenceDuration,
        timeline: sentenceWordTimings,
      })
    }
  }

  // If no sentences were created, create a single sentence with all words
  if (timeline.length === 0 && rawTimings.length > 0) {
    const wordTimeline: TTSTranscriptItem[] = rawTimings.map((raw) => ({
      text: raw.text,
      start: Math.round(raw.startTime * 1000),
      duration: Math.round((raw.endTime - raw.startTime) * 1000),
    }))

    const start = wordTimeline[0].start
    const lastWord = wordTimeline[wordTimeline.length - 1]
    const end = lastWord.start + lastWord.duration

    timeline.push({
      text: text.trim(),
      start,
      duration: end - start,
      timeline: wordTimeline,
    })
  }

  return { timeline }
}

