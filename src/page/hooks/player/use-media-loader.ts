/**
 * useMediaLoader Hook
 *
 * Handles loading media from IndexedDB and creating object URLs for playback.
 * Manages loading state, errors, and media metadata.
 */

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { usePlayerSessionStore } from '@/page/stores/player/player-session-store'
import { getCurrentDatabase, updateVideo, updateAudio } from '@/page/db'
import { getMediaUrl, FileAccessError, verifyFile } from '@/page/lib/file-access'
import { selectFileWithHandle } from '@/page/lib/file-helpers'
import { setDisplayTime } from '@/page/hooks/player/use-display-time'
import { createLogger } from '@/shared/lib/utils'
import type { Video, Audio } from '@/page/types/db'

const log = createLogger({ name: 'useMediaLoader' })

export interface UseMediaLoaderReturn {
  /** Media object URL for playback */
  mediaUrl: string | null
  /** Whether media is currently loading */
  isLoading: boolean
  /** Error message (if any) */
  error: string | null
  /** Error code for i18n (if any) */
  errorCode: string | null
  /** Current media object */
  currentMedia: Video | Audio | null
  /** Retry loading media */
  handleRetry: () => Promise<void>
  /** Reselect file for media */
  handleReselectFile: () => Promise<void>
}

export function useMediaLoader(): UseMediaLoaderReturn {
  const { t } = useTranslation()
  const currentSession = usePlayerSessionStore((s) => s.currentSession)

  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const [currentMedia, setCurrentMedia] = useState<Video | Audio | null>(null)

  // Load media blob from IndexedDB
  useEffect(() => {
    log.debug('Effect: Load media', { sessionId: currentSession?.mediaId })

    if (!currentSession) {
      setMediaUrl(null)
      setDisplayTime(0)
      return
    }

    let objectUrl: string | null = null
    let isMounted = true

    const loadMedia = async () => {
      log.debug('Loading media from database...')
      setIsLoading(true)
      setError(null)

      try {
        let media

        if (currentSession.mediaType === 'audio') {
          media = await getCurrentDatabase().audios.get(currentSession.mediaId)
        } else {
          media = await getCurrentDatabase().videos.get(currentSession.mediaId)
        }

        if (!isMounted) return

        if (!media) {
          log.error('Media not found!')
          setError(t('player.mediaNotFound'))
          setErrorCode(null)
          setCurrentMedia(null)
          setIsLoading(false)
          return
        }

        setCurrentMedia(media)

        // Get media URL using unified interface
        objectUrl = await getMediaUrl(media)
        log.debug('Media URL created:', objectUrl)
        setMediaUrl(objectUrl)
        setError(null)
        setErrorCode(null)
        setIsLoading(false)
      } catch (err) {
        if (!isMounted) return
        log.error('Loading media failed:', err)

        // Handle FileAccessError with i18n
        if (err instanceof FileAccessError) {
          setError(t(err.code))
          setErrorCode(err.code)
        } else {
          // Fallback for other errors
          setError(t('player.loadingFailed'))
          setErrorCode(null)
        }
        setIsLoading(false)
      }
    }

    loadMedia()

    // Cleanup: revoke object URL when session changes
    return () => {
      log.debug('Cleanup: revoking object URL')
      isMounted = false
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [currentSession?.mediaId, currentSession?.mediaType, t])

  // Handle retry for permission errors
  const handleRetry = async () => {
    if (!currentSession || !currentMedia) return

    log.debug('Retrying media load...')
    setIsLoading(true)
    setError(null)
    setErrorCode(null)

    try {
      const objectUrl = await getMediaUrl(currentMedia)
      log.debug('Media URL created on retry:', objectUrl)
      setMediaUrl(objectUrl)
      setIsLoading(false)
    } catch (err) {
      log.error('Retry failed:', err)
      if (err instanceof FileAccessError) {
        setError(t(err.code))
        setErrorCode(err.code)
      } else {
        setError(t('player.loadingFailed'))
        setErrorCode(null)
      }
      setIsLoading(false)
    }
  }

  // Handle file reselection for file not found errors
  const handleReselectFile = async () => {
    if (!currentSession || !currentMedia) return

    log.debug('Reselecting file...')
    setIsLoading(true)
    setError(null)
    setErrorCode(null)

    try {
      // Determine file types based on media type
      const isVideo = currentSession.mediaType === 'video'
      const fileTypes = isVideo
        ? [
            {
              description: 'Video files',
              accept: {
                'video/*': ['.mp4', '.webm', '.ogg', '.mov', '.avi'],
              },
            },
          ]
        : [
            {
              description: 'Audio files',
              accept: {
                'audio/*': ['.mp3', '.wav', '.ogg', '.webm', '.m4a', '.aac'],
              },
            },
          ]

      // Select file with handle
      const fileHandle = await selectFileWithHandle({
        types: fileTypes,
      })

      if (!fileHandle) {
        // User cancelled
        setIsLoading(false)
        return
      }

      // Get file and verify it matches the expected hash and size
      const file = await fileHandle.getFile()

      if (!currentMedia.md5 || !currentMedia.size) {
        throw new Error('Media metadata missing for verification')
      }

      // Verify file matches
      const isValid = await verifyFile(file, currentMedia.md5, currentMedia.size)
      if (!isValid) {
        setError(t('fileAccess.fileMismatch'))
        setErrorCode(null)
        setIsLoading(false)
        return
      }

      // Update media with new fileHandle
      if (isVideo) {
        await updateVideo(currentMedia.id, { fileHandle })
      } else {
        await updateAudio(currentMedia.id, { fileHandle })
      }

      // Update current media state
      const updatedMedia = { ...currentMedia, fileHandle }
      setCurrentMedia(updatedMedia)

      // Try to load media with new fileHandle
      const objectUrl = await getMediaUrl(updatedMedia)
      log.debug('Media URL created after reselection:', objectUrl)
      setMediaUrl(objectUrl)
      setIsLoading(false)
    } catch (err) {
      log.error('File reselection failed:', err)
      if (err instanceof FileAccessError) {
        setError(t(err.code))
        setErrorCode(err.code)
      } else {
        setError(t('player.loadingFailed'))
        setErrorCode(null)
      }
      setIsLoading(false)
    }
  }

  return {
    mediaUrl,
    isLoading,
    error,
    errorCode,
    currentMedia,
    handleRetry,
    handleReselectFile,
  }
}

