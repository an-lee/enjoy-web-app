/**
 * Audio Processing Utilities
 */

/**
 * Convert audio Blob to Float32Array (16kHz mono)
 * Uses Web Audio API to decode and resample audio
 */
export async function audioBlobToFloat32Array(audioBlob: Blob): Promise<Float32Array> {
  const arrayBuffer = await audioBlob.arrayBuffer()
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

  // Decode audio data
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

  // Get audio data (already Float32Array)
  const audioData = audioBuffer.getChannelData(0) // Get first channel

  // If stereo, convert to mono
  if (audioBuffer.numberOfChannels > 1) {
    const leftChannel = audioBuffer.getChannelData(0)
    const rightChannel = audioBuffer.getChannelData(1)
    const mono = new Float32Array(leftChannel.length)
    const SCALING_FACTOR = Math.sqrt(2)

    for (let i = 0; i < leftChannel.length; i++) {
      mono[i] = (SCALING_FACTOR * (leftChannel[i] + rightChannel[i])) / 2
    }

    // Resample to 16kHz if needed
    if (audioBuffer.sampleRate !== 16000) {
      return resampleAudio(mono, audioBuffer.sampleRate, 16000)
    }

    return mono
  }

  // Resample to 16kHz if needed
  if (audioBuffer.sampleRate !== 16000) {
    return resampleAudio(audioData, audioBuffer.sampleRate, 16000)
  }

  return audioData
}

/**
 * Simple linear resampling
 * For better quality, consider using a library like 'resampler' or 'audio-resampler'
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

