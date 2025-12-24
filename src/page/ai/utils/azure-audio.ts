/**
 * Azure Speech SDK Audio Processing Utilities
 *
 * Provides functions to convert audio blobs to PCM format required by Azure Speech SDK.
 * Azure Speech SDK requires PCM format: 16-bit, 16kHz, mono.
 */

/**
 * Simple linear resampling
 *
 * @param audioData - Source audio data as Float32Array
 * @param sourceSampleRate - Source sample rate in Hz
 * @param targetSampleRate - Target sample rate in Hz
 * @returns Resampled audio data as Float32Array
 */
export function resampleAudio(
  audioData: Float32Array,
  sourceSampleRate: number,
  targetSampleRate: number
): Float32Array {
  if (sourceSampleRate === targetSampleRate) {
    return audioData
  }

  const ratio = sourceSampleRate / targetSampleRate
  const newLength = Math.round(audioData.length / ratio)
  const result = new Float32Array(newLength)

  for (let i = 0; i < newLength; i++) {
    const srcIndex = i * ratio
    const index = Math.floor(srcIndex)
    const fraction = srcIndex - index

    if (index + 1 < audioData.length) {
      // Linear interpolation
      result[i] = audioData[index] * (1 - fraction) + audioData[index + 1] * fraction
    } else {
      result[i] = audioData[index]
    }
  }

  return result
}

/**
 * Convert audio blob to PCM format (16-bit, 16kHz, mono)
 * Handles WebM, WAV, and other audio formats by decoding with AudioContext
 *
 * @param audioBlob - Audio blob to convert (WebM, WAV, etc.)
 * @returns PCM audio data as Int16Array (16-bit, 16kHz, mono)
 * @throws Error if blob is too small or contains no audio data
 *
 * @example
 * const pcmData = await convertAudioBlobToPCM(audioBlob)
 * // Use pcmData with Azure Speech SDK
 */
export async function convertAudioBlobToPCM(audioBlob: Blob): Promise<Int16Array> {
  // Check blob size - if too small, it's likely empty
  if (audioBlob.size < 100) {
    throw new Error('Audio blob is too small or empty')
  }

  const arrayBuffer = await audioBlob.arrayBuffer()
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

  // Decode audio data
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0))

  // Get audio data (Float32Array, -1.0 to 1.0)
  let audioData: Float32Array

  // Convert to mono if stereo
  if (audioBuffer.numberOfChannels > 1) {
    const leftChannel = audioBuffer.getChannelData(0)
    const rightChannel = audioBuffer.getChannelData(1)
    const mono = new Float32Array(leftChannel.length)

    for (let i = 0; i < leftChannel.length; i++) {
      mono[i] = (leftChannel[i] + rightChannel[i]) / 2
    }
    audioData = mono
  } else {
    audioData = audioBuffer.getChannelData(0)
  }

  // Resample to 16kHz if needed
  let resampledData: Float32Array = audioData
  if (audioBuffer.sampleRate !== 16000) {
    resampledData = resampleAudio(audioData, audioBuffer.sampleRate, 16000)
  }

  // Convert Float32Array (-1.0 to 1.0) to Int16Array (-32768 to 32767)
  const pcmData = new Int16Array(resampledData.length)
  for (let i = 0; i < resampledData.length; i++) {
    // Clamp value to [-1, 1] range
    const sample = Math.max(-1, Math.min(1, resampledData[i]))
    // Convert to 16-bit integer
    pcmData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff
  }

  return pcmData
}

