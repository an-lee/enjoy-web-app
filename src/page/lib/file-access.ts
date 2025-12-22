/**
 * File Access Utilities
 *
 * Unified file access interface for Video and Audio entities.
 * Handles fileHandle, mediaUrl, and file verification.
 */

import type { Video, Audio } from '@/page/types/db'

// ============================================================================
// Error Types
// ============================================================================

/**
 * Standardized file access error with i18n key
 */
export class FileAccessError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly originalError?: Error
  ) {
    super(message)
    this.name = 'FileAccessError'
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FileAccessError)
    }
  }
}

/**
 * File access error codes for i18n translation
 */
export const FileAccessErrorCode = {
  MEDIA_NOT_AVAILABLE: 'fileAccess.mediaNotAvailable',
  FILE_NOT_FOUND: 'fileAccess.fileNotFound',
  PERMISSION_DENIED: 'fileAccess.permissionDenied',
  PERMISSION_REQUIRED: 'fileAccess.permissionRequired',
  FILE_ACCESS_FAILED: 'fileAccess.fileAccessFailed',
} as const

export type FileAccessErrorCode = typeof FileAccessErrorCode[keyof typeof FileAccessErrorCode]

// ============================================================================
// Constants
// ============================================================================

/**
 * Size threshold for uploading files to server (10MB)
 * Files smaller than this can be optionally uploaded for cross-device access
 */
export const UPLOAD_SIZE_THRESHOLD = 10 * 1024 * 1024 // 10MB

// ============================================================================
// File Hash Calculation
// ============================================================================

/**
 * Calculate SHA-256 hash of a file/blob
 * Returns hex string
 */
export async function calculateFileHash(file: File | Blob): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Alias for calculateFileHash (for compatibility)
 */
export async function generateMd5(file: File | Blob): Promise<string> {
  return calculateFileHash(file)
}

// ============================================================================
// Media URL Access
// ============================================================================

/**
 * Get media URL for playback
 *
 * Priority:
 * 1. mediaUrl (server URL) if available
 * 2. blob (for TTS-generated small files, Audio only) if available
 * 3. fileHandle (for user-uploaded files) if available
 *
 * @throws Error if no media is available
 */
export async function getMediaUrl(media: Video | Audio): Promise<string> {
  // 1. Priority: Server URL (if uploaded)
  if (media.mediaUrl) {
    return media.mediaUrl
  }

  // 2. Blob (for TTS-generated small files stored in IndexedDB, Audio only)
  if ('blob' in media && media.blob) {
    return URL.createObjectURL(media.blob)
  }

  // 3. Local file handle (for user-uploaded files)
  if (media.fileHandle) {
    try {
      // Check and request permission if needed
      await ensureFileHandlePermission(media.fileHandle)

      // Get file from handle
      const file = await getFileFromHandle(media.fileHandle)
      return URL.createObjectURL(file)
    } catch (error) {
      // Re-throw FileAccessError as-is (they have error codes for i18n)
      if (error instanceof FileAccessError) {
        throw error
      }
      // For other errors, wrap in FileAccessError
      throw new FileAccessError(
        FileAccessErrorCode.FILE_ACCESS_FAILED,
        'Failed to access local file. The file may have been moved or deleted.',
        error instanceof Error ? error : undefined
      )
    }
  }

  // 4. No media available
  throw new FileAccessError(
    FileAccessErrorCode.MEDIA_NOT_AVAILABLE,
    'Media file not available. Please select the file or ensure it is uploaded.'
  )
}

/**
 * Check if media file is available locally or on server
 */
export function hasMediaFile(media: Video | Audio): boolean {
  return !!(media.mediaUrl || ('blob' in media && media.blob) || media.fileHandle)
}

/**
 * Check if media needs file selection (cross-device sync scenario)
 */
export function needsFileSelection(media: Video | Audio): boolean {
  return media.provider === 'user' && !media.mediaUrl && !('blob' in media && media.blob) && !media.fileHandle
}

// ============================================================================
// File Verification
// ============================================================================

/**
 * Verify if a file matches the expected hash and size
 *
 * @param file - File to verify
 * @param expectedHash - Expected SHA-256 hash (hex string)
 * @param expectedSize - Expected file size in bytes (optional, for early rejection)
 * @returns true if file matches, false otherwise
 */
export async function verifyFile(
  file: File | Blob,
  expectedHash: string,
  expectedSize?: number
): Promise<boolean> {
  // Early rejection: size mismatch
  if (expectedSize !== undefined && file.size !== expectedSize) {
    return false
  }

  // Verify hash
  const actualHash = await calculateFileHash(file)
  return actualHash === expectedHash
}

// ============================================================================
// File Handle Helpers
// ============================================================================

/**
 * Check and request permission for a file handle
 *
 * @param handle - File handle to check permission for
 * @returns Promise<'granted' | 'denied' | 'prompt'> - Permission status
 */
export async function checkFileHandlePermission(
  handle: FileSystemFileHandle
): Promise<'granted' | 'denied' | 'prompt'> {
  // Check if permission API is available
  if (!('queryPermission' in handle)) {
    // If API not available, assume permission is granted (legacy behavior)
    return 'granted'
  }

  try {
    // Check current permission status
    const status = await (handle as any).queryPermission({ mode: 'read' })
    return status
  } catch (error) {
    console.warn('Failed to query file handle permission:', error)
    return 'prompt'
  }
}

/**
 * Request permission for a file handle
 *
 * @param handle - File handle to request permission for
 * @returns Promise<'granted' | 'denied'> - Permission status after request
 */
export async function requestFileHandlePermission(
  handle: FileSystemFileHandle
): Promise<'granted' | 'denied'> {
  // Check if permission API is available
  if (!('requestPermission' in handle)) {
    // If API not available, assume permission is granted (legacy behavior)
    return 'granted'
  }

  try {
    // Request permission
    const status = await (handle as any).requestPermission({ mode: 'read' })
    return status
  } catch (error) {
    console.warn('Failed to request file handle permission:', error)
    return 'denied'
  }
}

/**
 * Ensure file handle has read permission, requesting if needed
 *
 * @param handle - File handle to ensure permission for
 * @returns Promise<true> if permission is granted, throws FileAccessError if denied
 * @throws FileAccessError if permission is denied
 */
export async function ensureFileHandlePermission(
  handle: FileSystemFileHandle
): Promise<true> {
  // Check current permission
  const currentStatus = await checkFileHandlePermission(handle)

  if (currentStatus === 'granted') {
    return true
  }

  if (currentStatus === 'denied') {
    throw new FileAccessError(
      FileAccessErrorCode.PERMISSION_DENIED,
      'File access permission was denied. Please select the file again to grant access.'
    )
  }

  // Permission is 'prompt', request it
  const requestedStatus = await requestFileHandlePermission(handle)

  if (requestedStatus === 'granted') {
    return true
  }

  throw new FileAccessError(
    FileAccessErrorCode.PERMISSION_REQUIRED,
    'File access permission is required. Please grant access when prompted, or select the file again.'
  )
}

/**
 * Create a file handle from a File object
 *
 * Note: This requires user interaction via File System Access API.
 * If fileHandle is not available, the user must select the file again.
 *
 * @param file - File object to create handle for
 * @returns Promise<FileSystemFileHandle> or null if API not supported
 */
export async function createFileHandleFromFile(
  file: File
): Promise<FileSystemFileHandle | null> {
  // File System Access API is required
  if (!('showSaveFilePicker' in window)) {
    return null
  }

  try {
    // Create a writable file handle (user needs to grant permission)
    const handle = await (window as any).showSaveFilePicker({
      suggestedName: file.name,
      types: [
        {
          description: 'Media file',
          accept: {
            [file.type || 'application/octet-stream']: [`.${file.name.split('.').pop()}`],
          },
        },
      ],
    })

    // Write the file content
    const writable = await handle.createWritable()
    await writable.write(file)
    await writable.close()

    return handle
  } catch (error) {
    // User cancelled or error occurred
    console.error('Failed to create file handle:', error)
    return null
  }
}

/**
 * Get file from handle with error handling
 */
export async function getFileFromHandle(
  handle: FileSystemFileHandle
): Promise<File> {
  try {
    return await handle.getFile()
  } catch (error) {
    throw new FileAccessError(
      FileAccessErrorCode.FILE_NOT_FOUND,
      'Failed to access file. The file may have been moved, deleted, or permission was revoked.',
      error instanceof Error ? error : undefined
    )
  }
}

/**
 * Save blob as file and get fileHandle
 *
 * This is useful for TTS-generated audio or other programmatically created blobs.
 * Requires user interaction to grant file system access.
 *
 * @param blob - Blob to save
 * @param suggestedName - Suggested filename
 * @returns FileSystemFileHandle or null if user cancels
 */
export async function saveBlobAsFile(
  blob: Blob,
  suggestedName: string
): Promise<FileSystemFileHandle | null> {
  if (!('showSaveFilePicker' in window)) {
    throw new Error('File System Access API is not supported in this browser')
  }

  try {
    const fileExtension = suggestedName.split('.').pop() || 'mp3'
    const mimeType = blob.type || (fileExtension === 'mp3' ? 'audio/mpeg' : 'application/octet-stream')

    const handle = await (window as any).showSaveFilePicker({
      suggestedName,
      types: [
        {
          description: 'Media file',
          accept: {
            [mimeType]: [`.${fileExtension}`],
          },
        },
      ],
    })

    // Write the blob content
    const writable = await handle.createWritable()
    await writable.write(blob)
    await writable.close()

    return handle
  } catch (error) {
    // User cancelled or error occurred
    if ((error as Error).name === 'AbortError') {
      return null
    }
    throw error
  }
}

// ============================================================================
// Upload Decision Helper
// ============================================================================

/**
 * Check if file should be uploaded to server based on size
 */
export function shouldUploadToServer(size: number): boolean {
  return size < UPLOAD_SIZE_THRESHOLD
}
