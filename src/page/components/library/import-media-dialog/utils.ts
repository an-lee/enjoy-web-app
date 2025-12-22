/**
 * Utility functions for ImportMediaDialog
 */

/**
 * Get media duration from file or file handle
 */
export async function getMediaDuration(
  fileOrHandle: File | FileSystemFileHandle
): Promise<number> {
  // Get file from handle if needed
  const file = fileOrHandle instanceof File
    ? fileOrHandle
    : await fileOrHandle.getFile()

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const isVideo = file.type.startsWith('video/')
    const media = isVideo ? document.createElement('video') : document.createElement('audio')
    let isResolved = false

    // Add timeout to prevent hanging
    const timeout = setTimeout(() => {
      if (!isResolved) {
        isResolved = true
        URL.revokeObjectURL(url)
        reject(new Error('Timeout while loading media metadata'))
      }
    }, 30000) // 30 seconds timeout

    const cleanup = () => {
      if (!isResolved) {
        isResolved = true
        clearTimeout(timeout)
        URL.revokeObjectURL(url)
      }
    }

    media.onloadedmetadata = () => {
      if (isResolved) return
      const duration = Math.round(media.duration)
      cleanup()
      resolve(duration)
    }

    media.onerror = () => {
      if (isResolved) return
      cleanup()
      reject(new Error('Failed to load media metadata'))
    }

    // Handle potential permission errors
    media.onabort = () => {
      if (isResolved) return
      cleanup()
      reject(new Error('Media loading was aborted'))
    }

    try {
      media.src = url
    } catch (err) {
      cleanup()
      reject(new Error('Failed to set media source'))
    }
  })
}

