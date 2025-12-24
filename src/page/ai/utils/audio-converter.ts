import { createLogger } from '@/shared/lib/utils';
const logger = createLogger({ name: 'AudioConverter' });

/**
 * Audio Conversion Utilities
 *
 * Provides audio format conversion using Web Audio API.
 * Specifically for converting MP3 to WAV for Azure Speech SDK compatibility.
 */

/**
 * Convert audio blob to WAV format (16kHz, 16-bit, mono PCM for Azure Speech SDK)
 * @param audioBlob - Input audio blob (WebM, WAV, MP3, etc.)
 * @returns WAV format blob (16kHz, 16-bit, mono PCM)
 */
export async function convertToWav(audioBlob: Blob): Promise<Blob> {
  // Check blob size - if too small, it's likely empty
  if (audioBlob.size < 100) {
    throw new Error(`Audio blob is too small or empty: ${audioBlob.size} bytes`);
  }

  try {
    logger.debug('[AudioConverter] Converting audio blob to WAV', {
      blobType: audioBlob.type,
      blobSize: audioBlob.size,
    });

    // Create audio context
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    // Read audio blob as array buffer
    const arrayBuffer = await audioBlob.arrayBuffer();

    // Decode audio data
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Convert to WAV format
    const wavBlob = await encodeWav(audioBuffer);

    // Close audio context to free resources
    audioContext.close();

    logger.debug('[AudioConverter] Audio converted to WAV', {
      wavSize: wavBlob.size,
      wavType: wavBlob.type,
    });

    return wavBlob;
  } catch (error) {
    logger.error('[AudioConverter] Failed to convert to WAV:', error);
    throw new Error(`Audio conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Resample audio to target sample rate
 * @param audioBuffer - Input audio buffer
 * @param targetSampleRate - Target sample rate (e.g., 16000)
 * @returns Resampled audio buffer
 */
async function resampleAudio(audioBuffer: AudioBuffer, targetSampleRate: number): Promise<AudioBuffer> {
  const offlineContext = new OfflineAudioContext(
    audioBuffer.numberOfChannels,
    Math.ceil(audioBuffer.duration * targetSampleRate),
    targetSampleRate
  );

  const source = offlineContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineContext.destination);
  source.start(0);

  return await offlineContext.startRendering();
}

/**
 * Convert multi-channel audio to mono by averaging channels
 * @param audioBuffer - Input audio buffer
 * @returns Mono audio buffer
 */
async function convertToMono(audioBuffer: AudioBuffer): Promise<AudioBuffer> {
  if (audioBuffer.numberOfChannels === 1) {
    return audioBuffer;
  }

  const offlineContext = new OfflineAudioContext(
    1, // mono
    audioBuffer.length,
    audioBuffer.sampleRate
  );

  const source = offlineContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineContext.destination);
  source.start(0);

  return await offlineContext.startRendering();
}

/**
 * Encode AudioBuffer to WAV format (16kHz, 16-bit, mono PCM for Azure Speech SDK)
 * @param audioBuffer - AudioBuffer to encode
 * @returns WAV blob
 */
async function encodeWav(audioBuffer: AudioBuffer): Promise<Blob> {
  // Azure Speech SDK requirements: 16kHz, 16-bit, mono PCM
  const targetSampleRate = 16000;
  const format = 1; // PCM
  const bitDepth = 16;

  logger.debug('[AudioConverter] Original audio:', {
    sampleRate: audioBuffer.sampleRate,
    channels: audioBuffer.numberOfChannels,
    duration: audioBuffer.duration,
    length: audioBuffer.length,
  });

  // Step 1: Convert to mono if needed
  let processedBuffer = audioBuffer.numberOfChannels > 1
    ? await convertToMono(audioBuffer)
    : audioBuffer;

  logger.debug('[AudioConverter] After mono conversion:', {
    sampleRate: processedBuffer.sampleRate,
    channels: processedBuffer.numberOfChannels,
  });

  // Step 2: Resample to 16kHz if needed
  if (processedBuffer.sampleRate !== targetSampleRate) {
    processedBuffer = await resampleAudio(processedBuffer, targetSampleRate);
    logger.debug('[AudioConverter] After resampling:', {
      sampleRate: processedBuffer.sampleRate,
      channels: processedBuffer.numberOfChannels,
    });
  }

  const numberOfChannels = processedBuffer.numberOfChannels; // Should be 1 (mono)
  const sampleRate = processedBuffer.sampleRate; // Should be 16000

  // Calculate data size
  const length = processedBuffer.length * numberOfChannels * 2; // 2 bytes per sample for 16-bit
  const buffer = new ArrayBuffer(44 + length);
  const view = new DataView(buffer);

  // Write WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + length, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, format, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numberOfChannels * (bitDepth / 8), true); // byte rate
  view.setUint16(32, numberOfChannels * (bitDepth / 8), true); // block align
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, length, true);

  // Write audio data
  const offset = 44;
  const channelData = processedBuffer.getChannelData(0); // Get mono channel

  let index = offset;
  for (let i = 0; i < processedBuffer.length; i++) {
    const sample = Math.max(-1, Math.min(1, channelData[i]));
    view.setInt16(index, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
    index += 2;
  }

  logger.debug('[AudioConverter] Final WAV format:', {
    sampleRate,
    channels: numberOfChannels,
    bitDepth,
    dataSize: length,
    totalSize: 44 + length,
  });

  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Write string to DataView
 * @param view - DataView to write to
 * @param offset - Byte offset
 * @param string - String to write
 */
function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Get audio format info from blob
 * @param audioBlob - Audio blob to inspect
 * @returns Format information
 */
export async function getAudioInfo(audioBlob: Blob): Promise<{
  type: string;
  size: number;
  duration?: number;
}> {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const info = {
      type: audioBlob.type,
      size: audioBlob.size,
      duration: audioBuffer.duration,
    };

    audioContext.close();
    return info;
  } catch (error) {
    return {
      type: audioBlob.type,
      size: audioBlob.size,
    };
  }
}
