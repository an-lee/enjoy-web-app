/**
 * WebCodecs Utilities
 * Helper functions for audio format detection, codec configuration, and file parsing
 */

// ============================================================================
// Types
// ============================================================================

export interface CodecConfig {
  codec: string
  sampleRate?: number
  numberOfChannels?: number
  description?: string
}

export interface AudioFormatInfo {
  format: 'mp4' | 'mp3' | 'webm' | 'ogg' | 'wav' | 'unknown'
  codec?: string
  mimeType: string
  sampleRate?: number
  numberOfChannels?: number
}

// ============================================================================
// Format Detection
// ============================================================================

/**
 * Detect audio format from blob
 */
export async function detectAudioFormat(blob: Blob): Promise<AudioFormatInfo> {
  const mimeType = blob.type.toLowerCase()

  // Check MIME type first
  if (mimeType.includes('mp4') || mimeType.includes('m4a') || mimeType.includes('quicktime')) {
    return {
      format: 'mp4',
      codec: 'mp4a.40.2', // AAC-LC
      mimeType,
    }
  }

  if (mimeType.includes('mp3') || mimeType.includes('mpeg')) {
    return {
      format: 'mp3',
      codec: 'mp3',
      mimeType,
    }
  }

  if (mimeType.includes('webm')) {
    return {
      format: 'webm',
      codec: 'opus', // WebM typically uses Opus
      mimeType,
    }
  }

  if (mimeType.includes('ogg')) {
    return {
      format: 'ogg',
      codec: 'vorbis', // OGG typically uses Vorbis
      mimeType,
    }
  }

  if (mimeType.includes('wav')) {
    return {
      format: 'wav',
      codec: 'pcm', // WAV is typically PCM
      mimeType,
    }
  }

  // Try to detect from file signature (magic bytes)
  const arrayBuffer = await blob.slice(0, 12).arrayBuffer()
  const bytes = new Uint8Array(arrayBuffer)

  // MP4/M4A: ftyp box at start
  if (
    bytes.length >= 4 &&
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70
  ) {
    return {
      format: 'mp4',
      codec: 'mp4a.40.2',
      mimeType: mimeType || 'audio/mp4',
    }
  }

  // MP3: ID3 tag or frame sync
  if (
    (bytes.length >= 3 && bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) || // ID3
    (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) // MP3 frame sync
  ) {
    return {
      format: 'mp3',
      codec: 'mp3',
      mimeType: mimeType || 'audio/mpeg',
    }
  }

  // WebM: EBML header
  if (bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    return {
      format: 'webm',
      codec: 'opus',
      mimeType: mimeType || 'audio/webm',
    }
  }

  // OGG: OggS header
  if (bytes.length >= 4 && bytes[0] === 0x4f && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53) {
    return {
      format: 'ogg',
      codec: 'vorbis',
      mimeType: mimeType || 'audio/ogg',
    }
  }

  // WAV: RIFF header
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46
  ) {
    return {
      format: 'wav',
      codec: 'pcm',
      mimeType: mimeType || 'audio/wav',
    }
  }

  return {
    format: 'unknown',
    mimeType: mimeType || 'application/octet-stream',
  }
}

// ============================================================================
// Codec Configuration
// ============================================================================

/**
 * Get codec configuration for WebCodecs AudioDecoder
 */
export async function getCodecConfig(
  formatInfo: AudioFormatInfo,
  codecConfigBuffer?: ArrayBuffer
): Promise<CodecConfig | null> {
  // WebCodecs doesn't support PCM/WAV directly
  if (formatInfo.format === 'wav' || formatInfo.codec === 'pcm') {
    return null
  }

  let codec = formatInfo.codec || 'mp4a.40.2'

  // For MP4/AAC, try to determine the exact codec from configuration
  if (formatInfo.format === 'mp4' && codecConfigBuffer) {
    // Parse AAC codec string from esds configuration
    // mp4a.40.2 = AAC-LC, mp4a.40.5 = HE-AAC, etc.
    // For now, we'll use the detected codec or default to mp4a.40.2
    codec = formatInfo.codec || 'mp4a.40.2'
  }

  // Check if codec is supported using MediaCapabilities API
  // Note: This check is done in the main thread context, not in worker
  // For worker context, we'll rely on the decoder's error handling
  if (typeof self !== 'undefined' && 'MediaCapabilities' in self) {
    try {
      const capabilities = (self as any).MediaCapabilities
      const decodingInfo = await capabilities.decodingInfo({
        type: 'media-source',
        audio: {
          contentType: formatInfo.mimeType,
          channels: formatInfo.numberOfChannels || 2,
          bitrate: 128000,
          samplerate: formatInfo.sampleRate || 44100,
        },
      })

      if (!decodingInfo.supported) {
        console.warn(`[WebCodecs] Codec ${codec} not supported:`, decodingInfo)
        return null
      }

      console.debug(`[WebCodecs] Codec ${codec} is supported, smooth: ${decodingInfo.smooth}`)
    } catch (error) {
      console.warn('[WebCodecs] MediaCapabilities check failed:', error)
      // Continue anyway, let the decoder try
    }
  }

  return {
    codec,
    sampleRate: formatInfo.sampleRate,
    numberOfChannels: formatInfo.numberOfChannels,
    description: `Audio codec: ${codec}`,
  }
}

// ============================================================================
// MP4 Box Parser using mp4box.js
// ============================================================================

/**
 * Extract audio track data from MP4 file using mp4box.js
 * Returns chunks with proper codec configuration
 */
export async function extractMP4AudioChunks(blob: Blob): Promise<{
  chunks: ArrayBuffer[]
  codecConfig?: ArrayBuffer
  sampleRate?: number
  numberOfChannels?: number
}> {
  const arrayBuffer = await blob.arrayBuffer()

  // Dynamically import mp4box.js
  // mp4box exports as a namespace, not as default
  const mp4boxModule = await import('mp4box')
  const MP4Box = (mp4boxModule as any).default || mp4boxModule

  return new Promise((resolve, reject) => {
    const mp4boxFile = MP4Box.createFile()
    let resolved = false

    // Set up error handler
    mp4boxFile.onError = (error: Error) => {
      if (!resolved) {
        resolved = true
        reject(error)
      }
    }

    // Set up ready handler
    mp4boxFile.onReady = (info: any) => {
      if (resolved) return

      try {
        // Find audio track
        const audioTrack = info.tracks?.find((track: any) => track.type === 'audio')

        if (!audioTrack) {
          resolved = true
          reject(new Error('No audio track found in MP4 file'))
          return
        }

        // Get codec configuration from track
        const sampleRate = audioTrack.audio?.sample_rate || 44100
        const numberOfChannels = audioTrack.audio?.channel_count || 2

        // Extract samples
        const chunks: ArrayBuffer[] = []
        const trackId = audioTrack.id

        // Get all samples for the audio track
        const totalSamples = mp4boxFile.getSampleNumber(trackId)

        if (totalSamples === 0) {
          // No samples found, return whole file as fallback
          resolved = true
          resolve({
            chunks: [arrayBuffer],
            sampleRate,
            numberOfChannels,
          })
          return
        }

        // Extract samples
        for (let sampleIndex = 1; sampleIndex <= totalSamples; sampleIndex++) {
          try {
            const sample = mp4boxFile.getSample(trackId, sampleIndex)
            if (sample && sample.data) {
              // Get sample data
              const sampleData = sample.data
              // Create a new ArrayBuffer copy
              const chunk = new Uint8Array(sampleData).buffer
              chunks.push(chunk)
            }
          } catch (sampleError) {
            console.warn(`[MP4Box] Error extracting sample ${sampleIndex}:`, sampleError)
            // Continue with other samples
          }
        }

        // Get codec configuration box (esds for AAC)
        let codecConfigBuffer: ArrayBuffer | undefined
        if (audioTrack.codec === 'mp4a') {
          try {
            const trak = mp4boxFile.getTrackById(trackId)
            // Try to extract esds configuration
            if (trak?.mdia?.minf?.stbl?.stsd?.entries?.[0]) {
              const entry = trak.mdia.minf.stbl.stsd.entries[0]
              if (entry.esds?.esd) {
                // Extract esds buffer
                const esd = entry.esds.esd
                if (esd.buffer) {
                  codecConfigBuffer = esd.buffer
                } else if (esd.data) {
                  codecConfigBuffer = new Uint8Array(esd.data).buffer
                }
              }
            }
          } catch (configError) {
            console.warn('[MP4Box] Error extracting codec config:', configError)
            // Continue without codec config
          }
        }

        resolved = true
        resolve({
          chunks: chunks.length > 0 ? chunks : [arrayBuffer], // Fallback to whole file if no chunks
          codecConfig: codecConfigBuffer,
          sampleRate,
          numberOfChannels,
        })
      } catch (error) {
        if (!resolved) {
          resolved = true
          reject(error)
        }
      }
    }

    // Set up file buffer
    ;(arrayBuffer as any).fileStart = 0
    mp4boxFile.appendBuffer(arrayBuffer)
    mp4boxFile.flush()

    // Set timeout for parsing
    setTimeout(() => {
      if (!resolved) {
        resolved = true
        reject(new Error('MP4 parsing timeout'))
      }
    }, 10000) // 10 second timeout
  })
}

// ============================================================================
// MP3 Frame Parser (simplified)
// ============================================================================

/**
 * Extract MP3 frames from file
 * This is a simplified parser - looks for MP3 frame sync patterns
 */
export async function extractMP3Frames(blob: Blob): Promise<ArrayBuffer[]> {
  const arrayBuffer = await blob.arrayBuffer()
  const view = new DataView(arrayBuffer)
  const frames: ArrayBuffer[] = []

  let offset = 0

  // Skip ID3 tag if present
  if (arrayBuffer.byteLength >= 10) {
    const id3Header = String.fromCharCode(
      view.getUint8(0),
      view.getUint8(1),
      view.getUint8(2)
    )
    if (id3Header === 'ID3') {
      const id3Size = view.getUint32(6) & 0x7fffffff // 28-bit size
      offset = 10 + id3Size
    }
  }

  // Find MP3 frames (frame sync: 0xFF 0xE0-0xFF)
  while (offset < arrayBuffer.byteLength - 4) {
    const byte1 = view.getUint8(offset)
    const byte2 = view.getUint8(offset + 1)

    // Check for frame sync
    if (byte1 === 0xff && (byte2 & 0xe0) === 0xe0) {
      // Found potential frame header
      // MP3 frame header is 4 bytes, frame size varies
      // For simplicity, we'll extract chunks of reasonable size
      const frameSize = 1152 * 4 // Approximate frame size (may vary)
      const chunkEnd = Math.min(offset + frameSize, arrayBuffer.byteLength)
      const frame = arrayBuffer.slice(offset, chunkEnd)
      frames.push(frame)
      offset = chunkEnd
    } else {
      offset++
    }
  }

  // If no frames found, return the whole file (fallback)
  if (frames.length === 0) {
    return [arrayBuffer]
  }

  return frames
}

// ============================================================================
// Chunk Extractor
// ============================================================================

/**
 * Extract encoded audio chunks based on format
 * Returns chunks along with format information and codec configuration
 */
export async function extractAudioChunks(
  blob: Blob,
  formatInfo: AudioFormatInfo
): Promise<{
  chunks: ArrayBuffer[]
  codecConfig?: ArrayBuffer
  formatInfo: AudioFormatInfo
}> {
  switch (formatInfo.format) {
    case 'mp4': {
      const result = await extractMP4AudioChunks(blob)
      return {
        chunks: result.chunks,
        codecConfig: result.codecConfig,
        formatInfo: {
          ...formatInfo,
          sampleRate: result.sampleRate,
          numberOfChannels: result.numberOfChannels,
        },
      }
    }
    case 'mp3': {
      const frames = await extractMP3Frames(blob)
      return {
        chunks: frames,
        formatInfo,
      }
    }
    case 'webm':
    case 'ogg':
      // For WebM/OGG, we can try to decode the whole file
      // In a production implementation, you'd parse the container format
      return {
        chunks: [await blob.arrayBuffer()],
        formatInfo,
      }
    default:
      // Unknown format, return whole file
      return {
        chunks: [await blob.arrayBuffer()],
        formatInfo,
      }
  }
}

