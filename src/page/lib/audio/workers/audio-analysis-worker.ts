/**
 * Audio Decoding Web Worker
 * Handles audio decoding in a separate thread to avoid blocking the main thread.
 * Supports WebCodecs API when available for more efficient streaming decoding.
 */

import type { MonoPcmSegment } from '../segment'

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
  const arrayBuffer = await blob.arrayBuffer()

  // Detect codec from blob type
  const mimeType = blob.type || ''
  let codec = 'mp4a.40.2' // Default AAC

  if (mimeType.includes('mp3') || mimeType.includes('mpeg')) {
    codec = 'mp3'
  } else if (mimeType.includes('opus')) {
    codec = 'opus'
  } else if (mimeType.includes('vorbis')) {
    codec = 'vorbis'
  }

  return new Promise<MonoPcmSegment>((resolve, reject) => {
    const audioChunks: Float32Array[] = []
    let sampleRate = 44100
    let numberOfChannels = 2
    let totalSamples = 0

    const decoder = new AudioDecoder({
      output: (chunk: any) => {
        // Convert AudioData to Float32Array
        // AudioData format: { format: { sampleRate, numberOfChannels }, numberOfFrames, numberOfChannels, allocationSize }
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
      },
      error: (err: Error) => {
        reject(err)
      },
    })

    // Configure decoder
    // Note: WebCodecs requires proper codec configuration string
    // For MP4/AAC: 'mp4a.40.2', for MP3: 'mp3', etc.
    // The actual configuration may need to be extracted from the file
    // For now, we'll try a common configuration
    try {
      decoder.configure({
        codec,
        sampleRate: 44100, // Will be determined from actual data
        numberOfChannels: 2,
      })
    } catch (configError) {
      // If configuration fails, the codec string might be wrong
      // Fallback to Web Audio API
      reject(new Error(`WebCodecs configuration failed: ${configError}`))
      return
    }

    // Create encoded chunk
    // Note: For a complete file, we'd need to parse it into chunks
    // This is a simplified version - in production, you'd want to parse the file format
    const EncodedAudioChunk = (self as any).EncodedAudioChunk
    if (!EncodedAudioChunk) {
      reject(new Error('EncodedAudioChunk is not available'))
      return
    }

    const chunk = new EncodedAudioChunk({
      type: 'key', // First chunk is usually a key frame
      timestamp: 0,
      duration: 0,
      data: arrayBuffer,
    })

    decoder.decode(chunk)
    chunk.close?.()

    decoder.flush().then(() => {
      // Combine all chunks
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
    })
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
        segment = await decodeWithWebCodecs(blob, startTimeSeconds, endTimeSeconds)
      } catch (err) {
        // Fallback to Web Audio API if WebCodecs fails
        console.warn('[AudioAnalysisWorker] WebCodecs failed, falling back to Web Audio API:', err)
        const audioBuffer = await decodeWithWebAudio(blob)
        segment = extractMonoSegment(audioBuffer, startTimeSeconds, endTimeSeconds)
      }
    } else {
      // Use Web Audio API (traditional method)
      const audioBuffer = await decodeWithWebAudio(blob)
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

