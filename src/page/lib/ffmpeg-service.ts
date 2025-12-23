/**
 * FFmpeg Service
 *
 * Provides on-demand loading of FFmpeg.wasm for audio extraction from video files.
 * Uses local node_modules dependencies for core files.
 *
 * Features:
 * - Lazy loading: Only loads FFmpeg when needed
 * - Local dependencies: Core files loaded from node_modules
 * - File size validation: Checks file size before processing
 * - Error handling: Graceful fallback to MediaRecorder approach
 */

import { FFmpeg } from '@ffmpeg/ffmpeg'
import { toBlobURL, fetchFile } from '@ffmpeg/util'
import { createLogger } from '@/shared/lib/utils'

/**
 * FFmpeg core version to use
 * Should match the installed @ffmpeg/core and @ffmpeg/core-mt versions
 */
const FFMPEG_CORE_VERSION = '0.12.10'

/**
 * Get base URL for FFmpeg core files
 * Following the official example pattern: https://github.com/ffmpegwasm/ffmpeg.wasm/blob/main/apps/react-vite-app/src/App.tsx
 *
 * The official example uses CDN URLs with toBlobURL to bypass CORS.
 * For local dependencies, we can use the same pattern but with local file paths.
 *
 * Note: toBlobURL works with both HTTP URLs and same-origin URLs.
 */
const getCoreBaseURL = (useMT: boolean): string => {
  // Try to use local node_modules first (for offline/development)
  // Fallback to CDN if local files are not accessible
  const packageName = useMT ? 'core-mt' : 'core'

  // Use CDN URL (same as official example)
  // toBlobURL will fetch and convert to blob URL, bypassing CORS
  return `https://cdn.jsdelivr.net/npm/@ffmpeg/${packageName}@${FFMPEG_CORE_VERSION}/dist/esm`
}

// ============================================================================
// Logger
// ============================================================================

const log = createLogger({ name: 'FFmpegService' })

// ============================================================================
// Constants
// ============================================================================

/**
 * Recommended maximum file size for FFmpeg.wasm processing
 * Files larger than this may cause memory issues in browsers
 */
const MAX_RECOMMENDED_FILE_SIZE = 500 * 1024 * 1024 // 500MB

/**
 * Maximum file size that FFmpeg.wasm can attempt to process
 * Files larger than this will be rejected
 */
const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024 // 2GB

/**
 * Core files are now loaded from local node_modules dependencies
 * Using Vite's ?url suffix to get the file URLs
 */

// ============================================================================
// Types
// ============================================================================

export interface FFmpegServiceOptions {
  /**
   * Maximum file size in bytes (default: MAX_RECOMMENDED_FILE_SIZE)
   */
  maxFileSize?: number
  /**
   * Whether to use multi-threaded version (requires SharedArrayBuffer)
   */
  useMultiThread?: boolean
}

export interface ExtractAudioResult {
  success: boolean
  audioBlob?: Blob
  error?: string
}

// ============================================================================
// FFmpeg Service Class
// ============================================================================

class FFmpegService {
  private ffmpeg: FFmpeg | null = null
  private isLoading = false
  private loadPromise: Promise<void> | null = null
  private readonly maxFileSize: number
  private readonly useMultiThread: boolean

  constructor(options: FFmpegServiceOptions = {}) {
    this.maxFileSize = options.maxFileSize ?? MAX_RECOMMENDED_FILE_SIZE
    this.useMultiThread = options.useMultiThread ?? false
  }

  /**
   * Check if SharedArrayBuffer is available (required for multi-threaded version)
   */
  private isSharedArrayBufferAvailable(): boolean {
    return typeof SharedArrayBuffer !== 'undefined'
  }

  /**
   * Load FFmpeg.wasm core files from CDN
   * This is done lazily - only when needed
   */
  async load(): Promise<void> {
    // Return existing promise if already loading
    if (this.loadPromise) {
      return this.loadPromise
    }

    // Return immediately if already loaded
    if (this.ffmpeg) {
      return
    }

    // Create new load promise
    this.loadPromise = this._loadInternal()
    return this.loadPromise
  }

  private async _loadInternal(): Promise<void> {
    if (this.isLoading) {
      return
    }

    this.isLoading = true
    log.debug('Loading FFmpeg.wasm from local dependencies...')

    // Determine which core to use (declare outside try block for error handling)
    const useMT = this.useMultiThread && this.isSharedArrayBufferAvailable()
    const coreName = useMT ? 'core-mt' : 'core'

    try {
      // Build base URL for core files (following official example pattern)
      const baseURL = getCoreBaseURL(useMT)

      // Build file URLs (following official example pattern)
      const coreURL = `${baseURL}/ffmpeg-core.js`
      const wasmURL = `${baseURL}/ffmpeg-core.wasm`
      const workerURL = useMT ? `${baseURL}/ffmpeg-core.worker.js` : undefined

      log.info('Loading FFmpeg core from local dependencies', {
        coreName,
        useMT,
        baseURL,
        coreURL,
        wasmURL,
        workerURL,
        isDev: import.meta.env.DEV,
      })

      // Convert URLs to Blob URLs for loading (following official example)
      // toBlobURL is used to bypass CORS issue, urls with the same domain can be used directly
      let coreBlobURL: string
      let wasmBlobURL: string
      let workerBlobURL: string | undefined

      try {
        log.debug('Converting core URL to blob URL...', { coreURL })
        coreBlobURL = await toBlobURL(coreURL, 'text/javascript')
        log.debug('Core URL converted successfully')
      } catch (error) {
        log.error('Failed to convert core URL to blob URL', { coreURL, error })
        throw new Error(`Failed to load FFmpeg core: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }

      try {
        log.debug('Converting WASM URL to blob URL...', { wasmURL })
        wasmBlobURL = await toBlobURL(wasmURL, 'application/wasm')
        log.debug('WASM URL converted successfully')
      } catch (error) {
        log.error('Failed to convert WASM URL to blob URL', { wasmURL, error })
        throw new Error(`Failed to load FFmpeg WASM: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }

      if (workerURL) {
        try {
          log.debug('Converting worker URL to blob URL...', { workerURL })
          workerBlobURL = await toBlobURL(workerURL, 'text/javascript')
          log.debug('Worker URL converted successfully')
        } catch (error) {
          log.warn('Failed to convert worker URL to blob URL (may not be required)', { workerURL, error })
          // Worker URL is optional for single-threaded version
        }
      }

      // Create FFmpeg instance
      log.debug('Creating FFmpeg instance...')
      this.ffmpeg = new FFmpeg()

      // Load core files
      log.debug('Loading FFmpeg core files...', {
        hasCoreURL: !!coreBlobURL,
        hasWasmURL: !!wasmBlobURL,
        hasWorkerURL: !!workerBlobURL,
      })

      const loadConfig: {
        coreURL: string
        wasmURL: string
        workerURL?: string
      } = {
        coreURL: coreBlobURL,
        wasmURL: wasmBlobURL,
      }

      if (workerBlobURL) {
        loadConfig.workerURL = workerBlobURL
      }

      await this.ffmpeg.load(loadConfig)

      log.info('FFmpeg.wasm loaded successfully')
    } catch (error) {
      log.error('Failed to load FFmpeg.wasm', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        coreName,
        useMT,
      })
      this.isLoading = false
      this.loadPromise = null
      throw new Error(`Failed to load FFmpeg.wasm: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      this.isLoading = false
    }
  }

  /**
   * Check if FFmpeg is loaded
   */
  isLoaded(): boolean {
    return this.ffmpeg !== null
  }

  /**
   * Validate file size before processing
   */
  private validateFileSize(fileSize: number): { valid: boolean; error?: string } {
    if (fileSize > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File size (${(fileSize / 1024 / 1024).toFixed(2)}MB) exceeds maximum limit (${MAX_FILE_SIZE / 1024 / 1024}MB)`,
      }
    }

    if (fileSize > this.maxFileSize) {
      return {
        valid: true,
        error: `File size (${(fileSize / 1024 / 1024).toFixed(2)}MB) exceeds recommended limit (${this.maxFileSize / 1024 / 1024}MB). Processing may be slow or fail.`,
      }
    }

    return { valid: true }
  }

  /**
   * Extract audio from video blob using FFmpeg.wasm
   *
   * @param videoBlob - Video file blob
   * @param onProgress - Optional progress callback (0-100)
   * @returns Audio blob
   */
  async extractAudio(
    videoBlob: Blob,
    onProgress?: (progress: number) => void
  ): Promise<ExtractAudioResult> {
    log.info('Starting audio extraction with FFmpeg', {
      blobSize: videoBlob.size,
      blobType: videoBlob.type,
      isLoaded: this.isLoaded(),
    })

    // Validate file size
    const sizeValidation = this.validateFileSize(videoBlob.size)
    if (!sizeValidation.valid) {
      log.error('File size validation failed', { error: sizeValidation.error })
      return {
        success: false,
        error: sizeValidation.error,
      }
    }

    if (sizeValidation.error) {
      log.warn('File size warning:', sizeValidation.error)
    }

    try {
      // Ensure FFmpeg is loaded
      if (!this.ffmpeg) {
        log.info('FFmpeg not loaded, loading now...')
        await this.load()
        log.info('FFmpeg loaded successfully')
      } else {
        log.debug('FFmpeg already loaded')
      }

      if (!this.ffmpeg) {
        log.error('Failed to initialize FFmpeg')
        throw new Error('Failed to initialize FFmpeg')
      }

      // Set up progress callback if provided
      const progressCallback = onProgress
        ? ({ progress }: { progress: number }) => {
            // progress is 0-1, convert to 0-100
            onProgress(progress * 100)
          }
        : undefined

      if (progressCallback) {
        this.ffmpeg.on('progress', progressCallback)
      }

      // Generate unique file names
      const inputFileName = `input-${Date.now()}.${this.getFileExtension(videoBlob)}`
      const outputFileName = `output-${Date.now()}.aac`

      log.debug('Extracting audio from video:', {
        inputSize: videoBlob.size,
        inputFileName,
        outputFileName,
      })

      // Write input file to FFmpeg virtual file system
      log.debug('Writing input file to FFmpeg FS', { inputFileName, size: videoBlob.size })
      const inputFileData = await fetchFile(videoBlob)
      await this.ffmpeg.writeFile(inputFileName, inputFileData)
      log.debug('Input file written to FFmpeg FS', { inputFileSize: inputFileData.length })

      onProgress?.(10)

      // Extract audio using FFmpeg
      // -i: input file
      // -vn: disable video
      // -acodec copy: copy audio codec (fast, no re-encoding)
      // If copy fails, fallback to aac encoding
      log.debug('Starting FFmpeg audio extraction (codec copy)', {
        inputFileName,
        outputFileName,
      })
      try {
        const exitCode = await this.ffmpeg.exec(['-i', inputFileName, '-vn', '-acodec', 'copy', outputFileName])
        log.debug('FFmpeg codec copy completed', { exitCode })
      } catch (copyError) {
        log.warn('Audio codec copy failed, trying AAC encoding:', copyError)
        // Fallback: encode to AAC
        log.debug('Starting FFmpeg audio extraction (AAC encoding)')
        const exitCode = await this.ffmpeg.exec(['-i', inputFileName, '-vn', '-acodec', 'aac', '-b:a', '192k', outputFileName])
        log.debug('FFmpeg AAC encoding completed', { exitCode })
      }

      onProgress?.(90)

      // Read output file from FFmpeg virtual file system
      // readFile without encoding returns Uint8Array
      log.debug('Reading output file from FFmpeg FS', { outputFileName })
      const audioData = await this.ffmpeg.readFile(outputFileName)
      log.debug('Output file read from FFmpeg FS', {
        dataType: audioData instanceof Uint8Array ? 'Uint8Array' : typeof audioData,
        dataSize: audioData instanceof Uint8Array ? audioData.length : 'unknown',
      })

      // Clean up files
      log.debug('Cleaning up FFmpeg FS files')
      await this.ffmpeg.deleteFile(inputFileName)
      await this.ffmpeg.deleteFile(outputFileName)
      log.debug('FFmpeg FS files cleaned up')

      // Convert to Blob
      // audioData is FileData (Uint8Array | string), for binary files it's Uint8Array
      // Create a new Uint8Array to ensure proper type compatibility
      let audioArray: Uint8Array
      if (audioData instanceof Uint8Array) {
        // Create a new Uint8Array from the existing one to ensure type compatibility
        audioArray = new Uint8Array(audioData)
      } else if (typeof audioData === 'string') {
        // Should not happen for binary files, but handle it
        audioArray = new TextEncoder().encode(audioData)
      } else {
        // Fallback: convert to Uint8Array
        audioArray = new Uint8Array(audioData as ArrayLike<number>)
      }
      // Use Uint8Array directly, Blob constructor accepts it
      // Type assertion needed because TypeScript is strict about ArrayBufferLike vs ArrayBuffer
      const audioBlob = new Blob([audioArray as BlobPart], { type: 'audio/aac' })

      // Remove progress callback
      if (progressCallback) {
        this.ffmpeg.off('progress', progressCallback)
      }

      onProgress?.(100)

      log.debug('Audio extraction completed:', {
        originalSize: videoBlob.size,
        audioSize: audioBlob.size,
      })

      return {
        success: true,
        audioBlob,
      }
    } catch (error) {
      log.error('Failed to extract audio with FFmpeg:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during audio extraction',
      }
    }
  }

  /**
   * Get file extension from blob type or name
   */
  private getFileExtension(blob: Blob): string {
    // Try to get extension from MIME type
    const mimeType = blob.type
    if (mimeType) {
      const mimeToExt: Record<string, string> = {
        'video/mp4': 'mp4',
        'video/webm': 'webm',
        'video/ogg': 'ogg',
        'video/quicktime': 'mov',
        'video/x-msvideo': 'avi',
      }

      if (mimeToExt[mimeType]) {
        return mimeToExt[mimeType]
      }
    }

    // Default to mp4
    return 'mp4'
  }

  /**
   * Clean up FFmpeg instance
   */
  async cleanup(): Promise<void> {
    if (this.ffmpeg) {
      try {
        // FFmpeg doesn't have a terminate method, just clear the reference
        this.ffmpeg = null
        this.loadPromise = null
        log.debug('FFmpeg instance cleaned up')
      } catch (error) {
        log.warn('Error cleaning up FFmpeg:', error)
      }
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let ffmpegServiceInstance: FFmpegService | null = null

/**
 * Get or create FFmpeg service instance
 */
export function getFFmpegService(options?: FFmpegServiceOptions): FFmpegService {
  if (!ffmpegServiceInstance) {
    ffmpegServiceInstance = new FFmpegService(options)
  }
  return ffmpegServiceInstance
}

/**
 * Clean up FFmpeg service instance
 */
export async function cleanupFFmpegService(): Promise<void> {
  if (ffmpegServiceInstance) {
    await ffmpegServiceInstance.cleanup()
    ffmpegServiceInstance = null
  }
}

// ============================================================================
// Exports
// ============================================================================

export { FFmpegService }
export { MAX_RECOMMENDED_FILE_SIZE, MAX_FILE_SIZE }

