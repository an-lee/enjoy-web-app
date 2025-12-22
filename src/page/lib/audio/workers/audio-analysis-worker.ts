/**
 * Audio Decoding Web Worker
 * Handles audio decoding in a separate thread to avoid blocking the main thread.
 * Supports WebCodecs API when available for more efficient streaming decoding.
 */

import type { MonoPcmSegment } from '../segment'
import { detectAudioFormat, getCodecConfig, extractAudioChunks } from './webcodecs-utils'

// ============================================================================
// Types
// ============================================================================

interface DecodeAudioMessage {
  type: 'decode'
  taskId: string
  blob: Blob
  startTimeSeconds: number
  endTimeSeconds: number
  useWebCodecs?: boolean
}

interface WorkerResponse {
  type: 'progress' | 'result' | 'error'
  taskId: string
  data?: any
  error?: string
}

// ============================================================================
// WebCodecs Support Detection
// ============================================================================

function isWebCodecsSupported(): boolean {
  return (
    typeof self !== 'undefined' &&
    'AudioDecoder' in self &&
    typeof (self as any).AudioDecoder === 'function'
  )
}

// ============================================================================
// WebCodecs Decoder (Streaming)
// ============================================================================

/**
 * Decode audio using WebCodecs API (streaming, more efficient for large files)
 * Note: WebCodecs support is still limited in browsers, so this is experimental.
 */
async function decodeWithWebCodecs(
  blob: Blob,
  startTimeSeconds: number,
  endTimeSeconds: number
): Promise<MonoPcmSegment> {
  if (!isWebCodecsSupported()) {
    throw new Error('WebCodecs API is not supported in this worker')
  }

  const AudioDecoder = (self as any).AudioDecoder
  const EncodedAudioChunk = (self as any).EncodedAudioChunk

  if (!AudioDecoder || !EncodedAudioChunk) {
    throw new Error('WebCodecs APIs are not available')
  }

  // Detect audio format
  let formatInfo = await detectAudioFormat(blob)
  if (formatInfo.format === 'unknown') {
    throw new Error('Unable to detect audio format')
  }

  // Extract encoded chunks from the file (this may update formatInfo with additional metadata)
  const extractionResult = await extractAudioChunks(blob, formatInfo)
  formatInfo = extractionResult.formatInfo // Use updated format info with metadata
  const encodedChunks = extractionResult.chunks

  // Get codec configuration (with codec config buffer if available)
  const codecConfig = await getCodecConfig(formatInfo, extractionResult.codecConfig)
  if (!codecConfig) {
    throw new Error(`Codec ${formatInfo.codec} is not supported by WebCodecs`)
  }

  return new Promise<MonoPcmSegment>((resolve, reject) => {
    const audioChunks: Float32Array[] = []
    let sampleRate = 44100
    let numberOfChannels = 2
    let totalSamples = 0
    let currentTimestamp = 0
    let decoderError: Error | null = null

    const decoder = new AudioDecoder({
      output: (chunk: any) => {
        try {
          // Convert AudioData to Float32Array
          const format = chunk.format
          sampleRate = format.sampleRate
          numberOfChannels = format.numberOfChannels

          // Copy audio data from AudioData
          const frameCount = chunk.numberOfFrames
          const channelData: Float32Array[] = []

          for (let ch = 0; ch < numberOfChannels; ch++) {
            const channel = new Float32Array(frameCount)
            chunk.copyTo(channel, { planeIndex: ch })
            channelData.push(channel)
          }

          // Mix to mono
          const mono = new Float32Array(frameCount)
          for (let i = 0; i < frameCount; i++) {
            let sum = 0
            for (let ch = 0; ch < numberOfChannels; ch++) {
              sum += channelData[ch][i]
            }
            mono[i] = sum / numberOfChannels
          }

          audioChunks.push(mono)
          totalSamples += frameCount

          chunk.close()
        } catch (error) {
          console.error('[WebCodecs] Error processing audio chunk:', error)
          decoderError = error instanceof Error ? error : new Error(String(error))
        }
      },
      error: (err: Error) => {
        console.error('[WebCodecs] Decoder error:', err)
        decoderError = err
        // Don't reject immediately - let flush() handle it
      },
    })

    // Configure decoder
    try {
      decoder.configure({
        codec: codecConfig.codec,
        sampleRate: codecConfig.sampleRate,
        numberOfChannels: codecConfig.numberOfChannels,
      })
    } catch (configError) {
      reject(new Error(`WebCodecs configuration failed: ${configError}`))
      return
    }

    // Decode all chunks
    const decodeChunks = async () => {
      for (let i = 0; i < encodedChunks.length; i++) {
        if (decoderError) {
          reject(decoderError)
          return
        }

        const chunkData = encodedChunks[i]
        const chunk = new EncodedAudioChunk({
          type: i === 0 ? 'key' : 'delta', // First chunk is key frame
          timestamp: currentTimestamp,
          duration: 0, // Duration will be determined by decoder
          data: chunkData,
        })

        try {
          decoder.decode(chunk)

          // Estimate timestamp increment (rough approximation)
          // Actual duration depends on codec and frame size
          currentTimestamp += (chunkData.byteLength / 1000) * 1000000 // Rough estimate in microseconds
        } catch (error) {
          console.error(`[WebCodecs] Error decoding chunk ${i}:`, error)
          decoderError = error instanceof Error ? error : new Error(String(error))
          break
        }
      }

      // Flush decoder
      try {
        await decoder.flush()
      } catch (error) {
        console.error('[WebCodecs] Flush error:', error)
        if (!decoderError) {
          decoderError = error instanceof Error ? error : new Error(String(error))
        }
      }

      if (decoderError) {
        reject(decoderError)
        return
      }

      // Combine all chunks
      if (totalSamples === 0) {
        resolve({ sampleRate, samples: new Float32Array() })
        return
      }

      const combined = new Float32Array(totalSamples)
      let offset = 0
      for (const chunk of audioChunks) {
        combined.set(chunk, offset)
        offset += chunk.length
      }

      // Extract the requested segment
      const startSample = Math.max(0, Math.floor(startTimeSeconds * sampleRate))
      const endSample = Math.min(totalSamples, Math.ceil(endTimeSeconds * sampleRate))

      if (endSample <= startSample) {
        resolve({ sampleRate, samples: new Float32Array() })
        return
      }

      const segment = combined.subarray(startSample, endSample)

      resolve({
        sampleRate,
        samples: segment,
      })
    }

    // Start decoding
    decodeChunks().catch(reject)
  })
}

// ============================================================================
// Web Audio API Decoder (Fallback)
// ============================================================================

/**
 * Decode audio using Web Audio API (traditional method, requires full file)
 * Note: AudioContext is available in workers in modern browsers
 */
async function decodeWithWebAudio(blob: Blob): Promise<AudioBuffer> {
  // Create a temporary AudioContext for decoding
  // In workers, we can use AudioContext (supported in Chrome 66+, Firefox 60+)
  // Fallback to OfflineAudioContext if AudioContext is not available
  let audioCtx: AudioContext | OfflineAudioContext

  try {
    audioCtx = new AudioContext()
  } catch {
    // Fallback: Use OfflineAudioContext (always available in workers)
    // We'll create a temporary one just for decoding
    audioCtx = new OfflineAudioContext(2, 44100, 44100)
  }

  const arrayBuffer = await blob.arrayBuffer()
  const copy = arrayBuffer.slice(0) // Detach for some browsers

  try {
    const audioBuffer = await audioCtx.decodeAudioData(copy)
    if ('close' in audioCtx && typeof audioCtx.close === 'function') {
      await audioCtx.close() // Clean up (AudioContext only)
    }
    return audioBuffer
  } catch (error) {
    if ('close' in audioCtx && typeof audioCtx.close === 'function') {
      await audioCtx.close()
    }
    throw error
  }
}

/**
 * Extract mono segment from AudioBuffer
 */
function extractMonoSegment(
  audioBuffer: AudioBuffer,
  startTimeSeconds: number,
  endTimeSeconds: number
): MonoPcmSegment {
  const sampleRate = audioBuffer.sampleRate
  const totalSamples = audioBuffer.length

  const startSample = Math.max(0, Math.floor(startTimeSeconds * sampleRate))
  const endSample = Math.min(totalSamples, Math.ceil(endTimeSeconds * sampleRate))

  if (endSample <= startSample) {
    return { sampleRate, samples: new Float32Array() }
  }

  const channels = audioBuffer.numberOfChannels
  if (channels <= 0) return { sampleRate, samples: new Float32Array() }

  const length = endSample - startSample
  const mono = new Float32Array(length)

  for (let ch = 0; ch < channels; ch++) {
    const channelData = audioBuffer.getChannelData(ch)
    const view = channelData.subarray(startSample, endSample)
    for (let i = 0; i < length; i++) mono[i] += view[i]
  }

  const inv = 1 / channels
  for (let i = 0; i < length; i++) mono[i] *= inv

  return { sampleRate, samples: mono }
}

// ============================================================================
// Message Handlers
// ============================================================================

async function handleDecodeMessage(message: DecodeAudioMessage): Promise<WorkerResponse> {
  try {
    const { blob, startTimeSeconds, endTimeSeconds, useWebCodecs } = message

    let segment: MonoPcmSegment

    if (useWebCodecs && isWebCodecsSupported()) {
      // Try WebCodecs first (streaming, more efficient)
      try {
        const startTime = performance.now()
        segment = await decodeWithWebCodecs(blob, startTimeSeconds, endTimeSeconds)
        const decodeTime = performance.now() - startTime
        console.debug(
          `[AudioAnalysisWorker] WebCodecs decode completed in ${decodeTime.toFixed(2)}ms for ${(blob.size / 1024).toFixed(2)}KB`
        )
      } catch (err) {
        // Fallback to Web Audio API if WebCodecs fails
        const errorMsg = err instanceof Error ? err.message : String(err)
        console.warn(
          `[AudioAnalysisWorker] WebCodecs failed (${errorMsg}), falling back to Web Audio API`
        )
        const audioBuffer = await decodeWithWebAudio(blob)
        segment = extractMonoSegment(audioBuffer, startTimeSeconds, endTimeSeconds)
      }
    } else {
      // Use Web Audio API (traditional method)
      const startTime = performance.now()
      const audioBuffer = await decodeWithWebAudio(blob)
      const decodeTime = performance.now() - startTime
      console.debug(
        `[AudioAnalysisWorker] Web Audio API decode completed in ${decodeTime.toFixed(2)}ms for ${(blob.size / 1024).toFixed(2)}KB`
      )
      segment = extractMonoSegment(audioBuffer, startTimeSeconds, endTimeSeconds)
    }

    // Transfer ownership of the Float32Array to avoid copying
    return {
      type: 'result',
      taskId: message.taskId,
      data: segment,
    }
  } catch (error) {
    return {
      type: 'error',
      taskId: message.taskId,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

// ============================================================================
// Worker Message Handler
// ============================================================================

self.addEventListener('message', async (event: MessageEvent) => {
  const message = event.data

  try {
    let response: WorkerResponse

    if (message.type === 'decode') {
      response = await handleDecodeMessage(message as DecodeAudioMessage)
    } else {
      response = {
        type: 'error',
        taskId: message.taskId || 'unknown',
        error: `Unknown message type: ${message.type}`,
      }
    }

    // Transfer ArrayBuffers to avoid copying
    const transferList: Transferable[] = []
    if (response.data?.samples instanceof Float32Array) {
      transferList.push(response.data.samples.buffer)
    }

    if (transferList.length > 0) {
      self.postMessage(response, transferList)
    } else {
      self.postMessage(response)
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      taskId: message.taskId || 'unknown',
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

// Export for type checking
export type { DecodeAudioMessage, WorkerResponse }

