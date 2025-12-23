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
 * - WORKERSFS support: For large files with fileHandle (no memory limit)
 * - MEMFS fallback: For files without fileHandle or unsupported browsers
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
 * Recommended maximum file size for MEMFS processing
 * Files larger than this may cause memory issues in browsers
 */
const MAX_RECOMMENDED_FILE_SIZE = 500 * 1024 * 1024 // 500MB

/**
 * Maximum file size that MEMFS can attempt to process
 * Files larger than this will be rejected when using MEMFS
 */
const MAX_MEMFS_FILE_SIZE = 2 * 1024 * 1024 * 1024 // 2GB

/**
 * Maximum file size for WORKERSFS (theoretical limit, actual limit depends on browser/system)
 * WORKERSFS can handle much larger files as it doesn't load into memory
 */
const MAX_WORKERSFS_FILE_SIZE = 32 * 1024 * 1024 * 1024 // 32GB (same as quicksplit)

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
  filesystem?: 'MEMFS' | 'WORKERSFS' // Which filesystem was used
}

/**
 * Input source for audio extraction
 * Can be either a Blob (for MEMFS) or FileSystemFileHandle (for WORKERSFS)
 */
export type AudioExtractionSource =
  | { type: 'blob'; blob: Blob }
  | { type: 'fileHandle'; fileHandle: FileSystemFileHandle }

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
   * Check if File System Access API is available (required for WORKERSFS)
   */
  private isFileSystemAccessAvailable(): boolean {
    return 'showOpenFilePicker' in window && typeof FileSystemFileHandle !== 'undefined'
  }

  /**
   * Check if WORKERSFS is supported and should be used
   * Also checks if WORKERSFS is actually available in the loaded FFmpeg instance
   */
  private async shouldUseWORKERSFS(source: AudioExtractionSource): Promise<boolean> {
    // Only use WORKERSFS if:
    // 1. Source is fileHandle
    // 2. Browser supports File System Access API
    // 3. FFmpeg instance supports WORKERSFS (need to check after loading)
    if (source.type === 'fileHandle' && this.isFileSystemAccessAvailable()) {
      // Ensure FFmpeg is loaded to check WORKERSFS availability
      if (!this.ffmpeg) {
        await this.load()
      }
      return this.isWORKERSFSAvailable()
    }
    return false
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
   * Different limits for MEMFS vs WORKERSFS
   */
  private validateFileSize(fileSize: number, useWORKERSFS: boolean): { valid: boolean; error?: string } {
    const maxSize = useWORKERSFS ? MAX_WORKERSFS_FILE_SIZE : MAX_MEMFS_FILE_SIZE

    if (fileSize > maxSize) {
      return {
        valid: false,
        error: `File size (${(fileSize / 1024 / 1024).toFixed(2)}MB) exceeds maximum limit (${maxSize / 1024 / 1024}MB) for ${useWORKERSFS ? 'WORKERSFS' : 'MEMFS'}`,
      }
    }

    if (!useWORKERSFS && fileSize > this.maxFileSize) {
      return {
        valid: true,
        error: `File size (${(fileSize / 1024 / 1024).toFixed(2)}MB) exceeds recommended limit (${this.maxFileSize / 1024 / 1024}MB). Processing may be slow or fail. Consider using a browser that supports File System Access API for better performance.`,
      }
    }

    return { valid: true }
  }

  /**
   * Check if WORKERSFS is actually available and can be used
   * Based on quicksplit implementation: uses mount() method, not mountFileSystem()
   */
  private isWORKERSFSAvailable(): boolean {
    if (!this.ffmpeg) {
      return false
    }
    // Check if mount method exists (the correct API for WORKERSFS)
    return typeof (this.ffmpeg as any).mount === 'function' &&
           typeof (this.ffmpeg as any).createDir === 'function'
  }

  /**
   * Extract audio from video using FFmpeg.wasm
   * Supports both Blob (MEMFS) and FileSystemFileHandle (WORKERSFS)
   *
   * @param source - Video source (Blob or FileSystemFileHandle)
   * @param onProgress - Optional progress callback (0-100)
   * @returns Audio blob
   */
  async extractAudio(
    source: Blob | FileSystemFileHandle,
    onProgress?: (progress: number) => void
  ): Promise<ExtractAudioResult> {
    // Normalize source to AudioExtractionSource
    let extractionSource: AudioExtractionSource =
      source instanceof Blob
        ? { type: 'blob', blob: source }
        : { type: 'fileHandle', fileHandle: source }

    // Get file size
    let fileSize: number
    let fileType: string
    if (extractionSource.type === 'blob') {
      fileSize = extractionSource.blob.size
      fileType = extractionSource.blob.type
    } else {
      try {
        const file = await extractionSource.fileHandle.getFile()
        fileSize = file.size
        fileType = file.type
      } catch (error) {
        log.error('Failed to get file from handle:', error)
        return {
          success: false,
          error: `Failed to access file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }
      }
    }

    // Determine which filesystem to use
    // Check WORKERSFS availability (async because we may need to load FFmpeg first)
    let useWORKERSFS = false
    try {
      useWORKERSFS = await this.shouldUseWORKERSFS(extractionSource)
    } catch (error) {
      log.warn('Failed to check WORKERSFS availability, falling back to MEMFS:', error)
      useWORKERSFS = false
    }

    log.info('Starting audio extraction with FFmpeg', {
      fileSize,
      fileType,
      useWORKERSFS,
      isLoaded: this.isLoaded(),
      sourceType: extractionSource.type,
    })

    // If WORKERSFS is not available but we have fileHandle, convert to blob for MEMFS
    if (extractionSource.type === 'fileHandle' && !useWORKERSFS) {
      log.info('WORKERSFS not available, converting fileHandle to blob for MEMFS')
      try {
        const file = await extractionSource.fileHandle.getFile()
        extractionSource = { type: 'blob', blob: file }
        fileSize = file.size
        fileType = file.type
      } catch (error) {
        log.error('Failed to convert fileHandle to blob:', error)
        return {
          success: false,
          error: `Failed to access file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }
      }
    }

    // Validate file size (after potential conversion)
    const sizeValidation = this.validateFileSize(fileSize, useWORKERSFS)
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

    // Route to appropriate extraction method
    if (useWORKERSFS && extractionSource.type === 'fileHandle') {
      return this.extractAudioWithWORKERSFS(extractionSource.fileHandle, fileSize, fileType, onProgress)
    } else if (extractionSource.type === 'blob') {
      return this.extractAudioWithMEMFS(extractionSource.blob, fileSize, fileType, onProgress)
    } else {
      // This should not happen, but handle gracefully
      return {
        success: false,
        error: 'Invalid source type for audio extraction',
      }
    }
  }

  /**
   * Extract audio using MEMFS (memory-based file system)
   * For files without fileHandle or unsupported browsers
   */
  private async extractAudioWithMEMFS(
    videoBlob: Blob,
    fileSize: number,
    _fileType: string,
    onProgress?: (progress: number) => void
  ): Promise<ExtractAudioResult> {

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
      // -map 0:a:0: map first audio stream (ensures we get the audio track)
      // -avoid_negative_ts make_zero: handle timestamp issues
      // If copy fails, fallback to aac encoding
      log.debug('Starting FFmpeg audio extraction (codec copy)', {
        inputFileName,
        outputFileName,
      })
      try {
        // Use -map 0:a:0 to explicitly map the first audio stream
        // This ensures we extract the complete audio track
        const exitCode = await this.ffmpeg.exec([
          '-i', inputFileName,
          '-vn', // disable video
          '-map', '0:a:0', // map first audio stream explicitly
          '-acodec', 'copy', // copy audio codec (no re-encoding)
          '-avoid_negative_ts', 'make_zero', // handle timestamp issues
          outputFileName
        ])
        log.debug('FFmpeg codec copy completed', { exitCode })
      } catch (copyError) {
        log.warn('Audio codec copy failed, trying AAC encoding:', copyError)
        // Fallback: encode to AAC
        // Use -map 0:a:0 to explicitly map the first audio stream
        log.debug('Starting FFmpeg audio extraction (AAC encoding)')
        const exitCode = await this.ffmpeg.exec([
          '-i', inputFileName,
          '-vn', // disable video
          '-map', '0:a:0', // map first audio stream explicitly
          '-acodec', 'aac', // encode to AAC
          '-b:a', '192k', // audio bitrate
          '-avoid_negative_ts', 'make_zero', // handle timestamp issues
          outputFileName
        ])
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

      // Log audio extraction results with estimated duration
      // For AAC at 192kbps: ~24KB per second, for copy: varies by codec
      // This is just for logging/debugging, not exact calculation
      const estimatedDurationSeconds = audioBlob.size > 0
        ? Math.round((audioBlob.size / (192 * 1024 / 8)) * 10) / 10 // rough estimate for AAC
        : 0

      log.info('Audio extraction completed (MEMFS):', {
        originalSize: fileSize,
        audioSize: audioBlob.size,
        estimatedDurationSeconds,
        audioType: audioBlob.type,
        sizeRatio: fileSize > 0 ? ((audioBlob.size / fileSize) * 100).toFixed(2) + '%' : 'N/A',
      })

      return {
        success: true,
        audioBlob,
        filesystem: 'MEMFS',
      }
    } catch (error) {
      log.error('Failed to extract audio with FFmpeg (MEMFS):', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during audio extraction',
        filesystem: 'MEMFS',
      }
    }
  }

  /**
   * Extract audio using WORKERSFS (worker-based file system)
   * For large files with fileHandle - no memory limit
   * Based on quicksplit implementation: https://github.com/pavloshargan/quicksplit
   */
  private async extractAudioWithWORKERSFS(
    fileHandle: FileSystemFileHandle,
    fileSize: number,
    fileType: string,
    onProgress?: (progress: number) => void
  ): Promise<ExtractAudioResult> {
    log.info('Starting audio extraction with WORKERSFS', {
      fileSize,
      fileType,
    })

    const inputDir = '/input'
    const outputDir = '/output'
    let inputFile: File | null = null
    let inputFilePath = ''
    let outputFilePath = ''

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

      // Check if WORKERSFS is available
      if (!this.isWORKERSFSAvailable()) {
        log.warn('WORKERSFS not available, falling back to MEMFS')
        const file = await fileHandle.getFile()
        return this.extractAudioWithMEMFS(file, fileSize, fileType, onProgress)
      }

      // Get file from handle
      inputFile = await fileHandle.getFile()
      inputFilePath = `${inputDir}/${inputFile.name}`
      outputFilePath = `${outputDir}/output-${Date.now()}.aac`

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

      log.debug('Extracting audio from video (WORKERSFS):', {
        fileSize,
        inputFilePath,
        outputFilePath,
      })

      // Create directories
      log.debug('Creating directories for WORKERSFS')
      await (this.ffmpeg as any).createDir(inputDir).catch(() => {
        // Directory might already exist, ignore error
      })
      await (this.ffmpeg as any).createDir(outputDir).catch(() => {
        // Directory might already exist, ignore error
      })

      // Mount WORKERSFS with the file
      // Based on quicksplit: mount('WORKERFS', { files: [File] }, mountPoint)
      log.debug('Mounting WORKERSFS with file', { inputDir, fileName: inputFile.name })
      await (this.ffmpeg as any).mount('WORKERFS', { files: [inputFile] }, inputDir)

      onProgress?.(10)

      // Extract audio using FFmpeg
      // Use the mounted path for input file
      log.debug('Starting FFmpeg audio extraction (codec copy)', {
        inputFilePath,
        outputFilePath,
      })
      try {
        const exitCode = await this.ffmpeg.exec([
          '-i', inputFilePath,
          '-vn', // disable video
          '-map', '0:a:0', // map first audio stream explicitly
          '-acodec', 'copy', // copy audio codec (no re-encoding)
          '-avoid_negative_ts', 'make_zero', // handle timestamp issues
          outputFilePath
        ])
        log.debug('FFmpeg codec copy completed', { exitCode })
      } catch (copyError) {
        log.warn('Audio codec copy failed, trying AAC encoding:', copyError)
        log.debug('Starting FFmpeg audio extraction (AAC encoding)')
        const exitCode = await this.ffmpeg.exec([
          '-i', inputFilePath,
          '-vn', // disable video
          '-map', '0:a:0', // map first audio stream explicitly
          '-acodec', 'aac', // encode to AAC
          '-b:a', '192k', // audio bitrate
          '-avoid_negative_ts', 'make_zero', // handle timestamp issues
          outputFilePath
        ])
        log.debug('FFmpeg AAC encoding completed', { exitCode })
      }

      onProgress?.(90)

      // Read output file from FFmpeg virtual file system
      log.debug('Reading output file from WORKERSFS', { outputFilePath })
      const audioData = await this.ffmpeg.readFile(outputFilePath)
      log.debug('Output file read from WORKERSFS', {
        dataType: audioData instanceof Uint8Array ? 'Uint8Array' : typeof audioData,
        dataSize: audioData instanceof Uint8Array ? audioData.length : 'unknown',
      })

      // Clean up: unmount and delete directories
      log.debug('Cleaning up WORKERSFS')
      try {
        await (this.ffmpeg as any).deleteFile(outputFilePath).catch(() => {
          // File might not exist, ignore
        })
        await (this.ffmpeg as any).unmount(inputDir).catch(() => {
          // Might not be mounted, ignore
        })
        await (this.ffmpeg as any).deleteDir(inputDir).catch(() => {
          // Directory might not exist, ignore
        })
        await (this.ffmpeg as any).deleteDir(outputDir).catch(() => {
          // Directory might not exist, ignore
        })
        log.debug('WORKERSFS cleaned up')
      } catch (cleanupError) {
        log.warn('Error during WORKERSFS cleanup:', cleanupError)
      }

      // Convert to Blob
      let audioArray: Uint8Array
      if (audioData instanceof Uint8Array) {
        audioArray = new Uint8Array(audioData)
      } else if (typeof audioData === 'string') {
        audioArray = new TextEncoder().encode(audioData)
      } else {
        audioArray = new Uint8Array(audioData as ArrayLike<number>)
      }
      const audioBlob = new Blob([audioArray as BlobPart], { type: 'audio/aac' })

      // Remove progress callback
      if (progressCallback) {
        this.ffmpeg.off('progress', progressCallback)
      }

      onProgress?.(100)

      const estimatedDurationSeconds = audioBlob.size > 0
        ? Math.round((audioBlob.size / (192 * 1024 / 8)) * 10) / 10
        : 0

      log.info('Audio extraction completed (WORKERSFS):', {
        originalSize: fileSize,
        audioSize: audioBlob.size,
        estimatedDurationSeconds,
        audioType: audioBlob.type,
        sizeRatio: fileSize > 0 ? ((audioBlob.size / fileSize) * 100).toFixed(2) + '%' : 'N/A',
      })

      return {
        success: true,
        audioBlob,
        filesystem: 'WORKERSFS',
      }
    } catch (error) {
      log.error('Failed to extract audio with FFmpeg (WORKERSFS):', error)

      // Cleanup on error
      try {
        if (this.ffmpeg) {
          await (this.ffmpeg as any).unmount(inputDir).catch(() => {})
          await (this.ffmpeg as any).deleteDir(inputDir).catch(() => {})
          await (this.ffmpeg as any).deleteDir(outputDir).catch(() => {})
        }
      } catch (cleanupError) {
        log.warn('Error during cleanup after failure:', cleanupError)
      }

      // Try fallback to MEMFS if possible
      if (inputFile) {
        log.info('Attempting fallback to MEMFS after WORKERSFS failure')
        try {
          return await this.extractAudioWithMEMFS(inputFile, fileSize, fileType, onProgress)
        } catch (fallbackError) {
          log.error('MEMFS fallback also failed:', fallbackError)
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during audio extraction',
        filesystem: 'WORKERSFS',
      }
    }
  }

  /**
   * Get file extension from blob type or name
   */
  private getFileExtension(blob: Blob): string {
    return this.getFileExtensionFromType(blob.type)
  }

  /**
   * Get file extension from MIME type
   */
  private getFileExtensionFromType(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'video/mp4': 'mp4',
      'video/webm': 'webm',
      'video/ogg': 'ogg',
      'video/quicktime': 'mov',
      'video/x-msvideo': 'avi',
    }

    if (mimeType && mimeToExt[mimeType]) {
      return mimeToExt[mimeType]
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
export { MAX_RECOMMENDED_FILE_SIZE, MAX_MEMFS_FILE_SIZE as MAX_FILE_SIZE, MAX_WORKERSFS_FILE_SIZE }

