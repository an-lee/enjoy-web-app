/**
 * useRetranscribe Hook
 *
 * Handles retranscription of media using ASR service.
 * Supports both audio and video media types.
 * Can use existing media element if provided, otherwise falls back to blob-based approach.
 */

import { useState, useCallback, RefObject } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { usePlayerStore } from '@/page/stores/player'
import { getCurrentDatabase } from '@/page/db'
import { asrService } from '@/page/ai/services/asr'
import { getAIServiceConfig } from '@/page/ai/core/config'
import { useCreateTranscript } from '@/page/hooks/queries'
import { getFFmpegService, MAX_RECOMMENDED_FILE_SIZE } from '@/page/lib/ffmpeg-service'
import { createLogger } from '@/shared/lib/utils'
import type { TranscriptInput, TargetType } from '@/page/types/db'

// ============================================================================
// Logger
// ============================================================================

const log = createLogger({ name: 'useRetranscribe' })

// ============================================================================
// Error Messages Helper
// ============================================================================

/**
 * Get user-friendly error message for retranscription errors
 */
function getRetranscriptionErrorMessage(error: unknown, t: (key: string, options?: any) => string): string {
  const errorMessage = error instanceof Error ? error.message : String(error)

  // Map common error messages to user-friendly translations
  if (errorMessage.includes('not found') || errorMessage.includes('not available')) {
    if (errorMessage.includes('Audio') || errorMessage.includes('audio')) {
      return t('player.transcript.retranscribeErrors.audioNotFound', {
        defaultValue: 'Audio file not found. Please try reloading the media.',
      })
    }
    if (errorMessage.includes('Video') || errorMessage.includes('video')) {
      return t('player.transcript.retranscribeErrors.videoNotFound', {
        defaultValue: 'Video file not found. Please try reloading the media.',
      })
    }
    return t('player.transcript.retranscribeErrors.mediaNotFound', {
      defaultValue: 'Media file not found. Please try reloading the media.',
    })
  }

  if (errorMessage.includes('not ready') || errorMessage.includes('not ready')) {
    return t('player.transcript.retranscribeErrors.mediaNotReady', {
      defaultValue: 'Media is not ready. Please wait for it to load completely.',
    })
  }

  if (errorMessage.includes('No audio track') || errorMessage.includes('no audio track')) {
    return t('player.transcript.retranscribeErrors.noAudioTrack', {
      defaultValue: 'No audio track found in the media file.',
    })
  }

  if (errorMessage.includes('CORS') || errorMessage.includes('cors')) {
    return t('player.transcript.retranscribeErrors.corsError', {
      defaultValue: 'Unable to access media file due to browser security restrictions.',
    })
  }

  if (errorMessage.includes('ASR') || errorMessage.includes('transcription')) {
    return t('player.transcript.retranscribeErrors.asrFailed', {
      defaultValue: 'Speech recognition failed. Please try again or check your settings.',
    })
  }

  if (errorMessage.includes('FFmpeg') || errorMessage.includes('ffmpeg')) {
    return t('player.transcript.retranscribeErrors.ffmpegFailed', {
      defaultValue: 'Audio extraction failed. Please try again.',
    })
  }

  if (errorMessage.includes('MediaRecorder') || errorMessage.includes('MediaRecorder')) {
    return t('player.transcript.retranscribeErrors.mediaRecorderFailed', {
      defaultValue: 'Audio capture failed. Your browser may not support this feature.',
    })
  }

  if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
    return t('player.transcript.retranscribeErrors.networkError', {
      defaultValue: 'Network error occurred. Please check your connection and try again.',
    })
  }

  if (errorMessage.includes('file size') || errorMessage.includes('too large')) {
    return t('player.transcript.retranscribeErrors.fileTooLarge', {
      defaultValue: 'File is too large to process. Please try a smaller file.',
    })
  }

  // Default error message
  return t('player.transcript.retranscribeErrors.generic', {
    defaultValue: 'Failed to retranscribe media. Please try again.',
    error: errorMessage,
  })
}

/**
 * Extract audio from media element using MediaRecorder API
 * This captures the audio output from an existing HTMLMediaElement
 */
async function extractAudioFromMediaElement(
  mediaElement: HTMLAudioElement | HTMLVideoElement
): Promise<Blob> {
  log.debug('Starting audio extraction from media element', {
    readyState: mediaElement.readyState,
    duration: mediaElement.duration,
    paused: mediaElement.paused,
  })

  return new Promise((resolve, reject) => {
    // Check if element is ready
    if (mediaElement.readyState < 2) {
      // HAVE_CURRENT_DATA - need at least some data loaded
      log.error('Media element not ready', { readyState: mediaElement.readyState })
      reject(new Error('Media element not ready'))
      return
    }

    let mediaRecorder: MediaRecorder | null = null
    const chunks: Blob[] = []

    try {
      log.debug('Setting up MediaRecorder for audio capture')
      // Use captureStream if available (Chrome/Edge)
      let stream: MediaStream
      if ('captureStream' in mediaElement && typeof mediaElement.captureStream === 'function') {
        log.debug('Using captureStream API')
        stream = mediaElement.captureStream()
      } else {
        log.debug('Using AudioContext fallback')
        // Fallback: use AudioContext to capture audio
        const audioContext = new AudioContext()
        const source = audioContext.createMediaElementSource(mediaElement)
        const destination = audioContext.createMediaStreamDestination()
        source.connect(destination)
        stream = destination.stream

        // Store audioContext for cleanup
        ;(mediaElement as any)._retranscribeAudioContext = audioContext
      }

      // Find audio track
      const audioTracks = stream.getAudioTracks()
      log.debug('Audio tracks found', { count: audioTracks.length })
      if (audioTracks.length === 0) {
        log.error('No audio track found in media element')
        reject(new Error('No audio track found in media element'))
        return
      }

      // Create MediaRecorder with audio track only
      const audioStream = new MediaStream(audioTracks)
      mediaRecorder = new MediaRecorder(audioStream, {
        mimeType: 'audio/webm;codecs=opus',
      })

      log.debug('MediaRecorder created', {
        mimeType: mediaRecorder.mimeType,
        state: mediaRecorder.state,
      })

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
          log.debug('MediaRecorder data available', {
            size: event.data.size,
            totalChunks: chunks.length,
            totalSize: chunks.reduce((sum, chunk) => sum + chunk.size, 0),
          })
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' })
        log.debug('MediaRecorder stopped', {
          blobSize: audioBlob.size,
          chunksCount: chunks.length,
          duration: mediaElement.duration,
        })
        // Cleanup AudioContext if we created one
        const audioContext = (mediaElement as any)._retranscribeAudioContext
        if (audioContext) {
          audioContext.close()
          delete (mediaElement as any)._retranscribeAudioContext
        }
        log.info('Audio extraction from media element completed', { size: audioBlob.size })
        resolve(audioBlob)
      }

      mediaRecorder.onerror = (event) => {
        log.error('MediaRecorder error', { event })
        const audioContext = (mediaElement as any)._retranscribeAudioContext
        if (audioContext) {
          audioContext.close()
          delete (mediaElement as any)._retranscribeAudioContext
        }
        reject(new Error('MediaRecorder error'))
      }

      // Save current time and playback state
      const wasPlaying = !mediaElement.paused
      const currentTime = mediaElement.currentTime

      // NOTE: We cannot use accelerated playback (playbackRate > 1) because
      // MediaRecorder captures the audio stream at the actual playback speed.
      // Accelerated playback would result in accelerated audio, which would
      // severely degrade ASR transcription quality.
      // For faster extraction, consider using FFmpeg.js instead.

      // Reset to start and play at normal speed
      log.debug('Starting recording', {
        wasPlaying,
        currentTime,
        duration: mediaElement.duration,
      })
      mediaElement.currentTime = 0
      mediaRecorder.start()
      log.debug('MediaRecorder started', { state: mediaRecorder.state })

      const playPromise = mediaElement.play()
      if (playPromise) {
        playPromise
          .then(() => {
            log.debug('Media playback started for recording')
          })
          .catch((err) => {
            log.error('Failed to play media for recording:', err)
          })
      }

      // Stop when media ends
      const handleEnded = () => {
        log.debug('Media playback ended, stopping recorder')
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop()
        }
        // Restore playback state
        mediaElement.currentTime = currentTime
        if (wasPlaying) {
          mediaElement.play().catch(() => {
            // Ignore play errors on restore
          })
        }
        mediaElement.removeEventListener('ended', handleEnded)
      }

      mediaElement.addEventListener('ended', handleEnded)
      log.debug('Waiting for media to finish playing...')
    } catch (error) {
      log.error('Error in extractAudioFromMediaElement:', error)
      const audioContext = (mediaElement as any)._retranscribeAudioContext
      if (audioContext) {
        audioContext.close()
        delete (mediaElement as any)._retranscribeAudioContext
      }
      reject(error)
    }
  })
}

/**
 * Extract audio from video blob using MediaRecorder API
 * This creates a video element, captures its audio track, and records it
 * Used as fallback when media element is not available
 */
async function extractAudioFromVideo(videoBlob: Blob): Promise<Blob> {
  log.debug('Starting audio extraction from video blob', {
    blobSize: videoBlob.size,
    blobType: videoBlob.type,
  })

  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const objectUrl = URL.createObjectURL(videoBlob)
    video.src = objectUrl
    video.muted = true
    video.playsInline = true
    video.crossOrigin = 'anonymous'

    let mediaRecorder: MediaRecorder | null = null
    const chunks: Blob[] = []

    const cleanup = () => {
      log.debug('Cleaning up video element and object URL')
      URL.revokeObjectURL(objectUrl)
      video.remove()
    }

    video.onloadedmetadata = async () => {
      log.debug('Video metadata loaded', {
        duration: video.duration,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
      })

      try {
        log.debug('Setting up MediaRecorder for video audio extraction')
        // Use MediaRecorder to capture audio from video
        // Create an audio context and connect the video element's audio track
        const audioContext = new AudioContext()
        const source = audioContext.createMediaElementSource(video)
        const destination = audioContext.createMediaStreamDestination()
        source.connect(destination)

        mediaRecorder = new MediaRecorder(destination.stream, {
          mimeType: 'audio/webm;codecs=opus',
        })

        log.debug('MediaRecorder created for video', {
          mimeType: mediaRecorder.mimeType,
          state: mediaRecorder.state,
        })

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data)
            log.debug('MediaRecorder data available', {
              size: event.data.size,
              totalChunks: chunks.length,
              totalSize: chunks.reduce((sum, chunk) => sum + chunk.size, 0),
            })
          }
        }

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(chunks, { type: 'audio/webm' })
          log.debug('MediaRecorder stopped', {
            blobSize: audioBlob.size,
            chunksCount: chunks.length,
            videoDuration: video.duration,
          })
          audioContext.close()
          cleanup()
          log.info('Audio extraction from video blob completed', { size: audioBlob.size })
          resolve(audioBlob)
        }

        mediaRecorder.onerror = (event) => {
          log.error('MediaRecorder error', { event })
          audioContext.close()
          cleanup()
          reject(new Error('MediaRecorder error'))
        }

        // NOTE: We cannot use accelerated playback (playbackRate > 1) because
        // MediaRecorder captures the audio stream at the actual playback speed.
        // Accelerated playback would result in accelerated audio, which would
        // severely degrade ASR transcription quality.
        // For faster extraction, consider using FFmpeg.js instead.

        // Start recording and play video at normal speed
        log.debug('Starting video playback and recording', { duration: video.duration })
        mediaRecorder.start()
        await video.play()
        log.debug('Video playback started, waiting for completion...')

        // Stop when video ends
        video.onended = () => {
          log.debug('Video playback ended, stopping recorder')
          if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop()
          }
        }
      } catch (error) {
        log.error('Error in video.onloadedmetadata:', error)
        cleanup()
        reject(error)
      }
    }

    video.onerror = (event) => {
      log.error('Video load error', { event })
      cleanup()
      reject(new Error('Failed to load video'))
    }

    // Load the video
    log.debug('Loading video element...')
    video.load()
  })
}

/**
 * Get blob from video element's src URL
 * Attempts to fetch the blob from the video element's current src
 * Returns null if unable to fetch (e.g., CORS issues, invalid URL)
 */
async function getBlobFromVideoElement(
  videoElement: HTMLVideoElement
): Promise<Blob | null> {
  const src = videoElement.src
  if (!src) {
    log.debug('Video element has no src')
    return null
  }

  // Check if it's a blob URL (blob:http://...)
  if (src.startsWith('blob:')) {
    log.debug('Video element src is a blob URL, fetching...', { src })
    try {
      const response = await fetch(src)
      if (response.ok) {
        const blob = await response.blob()
        log.debug('Blob fetched from video element src', { size: blob.size, type: blob.type })
        return blob
      } else {
        log.warn('Failed to fetch blob from video element src', {
          status: response.status,
          statusText: response.statusText,
        })
        return null
      }
    } catch (error) {
      log.warn('Error fetching blob from video element src:', error)
      return null
    }
  }

  // Check if it's a data URL (data:video/...)
  if (src.startsWith('data:')) {
    log.debug('Video element src is a data URL, converting...')
    try {
      const response = await fetch(src)
      const blob = await response.blob()
      log.debug('Blob converted from data URL', { size: blob.size, type: blob.type })
      return blob
    } catch (error) {
      log.warn('Error converting data URL to blob:', error)
      return null
    }
  }

  // For remote URLs (http/https), try to fetch
  if (src.startsWith('http://') || src.startsWith('https://')) {
    log.debug('Video element src is a remote URL, fetching...', { src })
    try {
      const response = await fetch(src)
      if (response.ok) {
        const blob = await response.blob()
        log.debug('Blob fetched from remote URL', { size: blob.size, type: blob.type })
        return blob
      } else {
        log.warn('Failed to fetch blob from remote URL', {
          status: response.status,
          statusText: response.statusText,
        })
        return null
      }
    } catch (error) {
      log.warn('Error fetching blob from remote URL (may be CORS issue):', error)
      return null
    }
  }

  log.debug('Video element src format not recognized', { src })
  return null
}

/**
 * Convert ASR segments to transcript timeline format
 */
function convertASRSegmentsToTimeline(
  segments: Array<{ text: string; start: number; end: number }>
): Array<{ text: string; start: number; duration: number }> {
  return segments.map((segment) => ({
    text: segment.text,
    start: Math.round(segment.start * 1000), // Convert seconds to milliseconds
    duration: Math.round((segment.end - segment.start) * 1000), // Convert to milliseconds
  }))
}

export interface UseRetranscribeOptions {
  /**
   * Optional ref to existing media element (audio or video)
   * If provided, will use this element directly instead of loading from blob
   */
  mediaRef?: RefObject<HTMLAudioElement | HTMLVideoElement | null>
}

export function useRetranscribe(options?: UseRetranscribeOptions) {
  const { mediaRef } = options || {}
  const { t } = useTranslation()
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)
  const [progressPercent, setProgressPercent] = useState<number | null>(null)
  const currentSession = usePlayerStore((state) => state.currentSession)
  const createTranscript = useCreateTranscript()

  const retranscribe = useCallback(
    async (language?: string, onProgress?: (progress: string, percent?: number) => void) => {
      log.info('Starting retranscription', {
        mediaId: currentSession?.mediaId,
        mediaType: currentSession?.mediaType,
        language,
        hasMediaRef: !!mediaRef?.current,
      })

      if (!currentSession) {
        log.error('No current session available')
        toast.error(t('player.transcript.noMedia', { defaultValue: 'No media is currently playing' }))
        return
      }

      setIsTranscribing(true)
      setProgress('Loading media...')
      setProgressPercent(null)
      onProgress?.('Loading media...')

      try {
        let targetType: TargetType | undefined
        let targetId: string | undefined
        let audioBlob: Blob | undefined
        let videoBlob: Blob | undefined // For video files, store the video blob separately

        // For video files, prefer FFmpeg (faster, no playback needed)
        // For audio files, use media element if available (already loaded)
        const preferFFmpeg = currentSession.mediaType === 'video'

        // Priority 1: For video files with mediaRef, try to get blob from video element src
        // This avoids database lookup and works with fileHandle (which creates blob URLs)
        if (mediaRef?.current && preferFFmpeg) {
          const videoElement = mediaRef.current as HTMLVideoElement
          log.debug('Video file detected, attempting to get blob from video element src')
          setProgress('Loading video from element...')
          onProgress?.('Loading video from element...', 5)

          try {
            const blob = await getBlobFromVideoElement(videoElement)
            if (blob) {
              videoBlob = blob
              targetType = 'Video'
              targetId = currentSession.mediaId
              log.info('Blob obtained from video element src', {
                size: blob.size,
                type: blob.type,
              })
            } else {
              log.debug('Could not get blob from video element src, will load from database')
            }
          } catch (error) {
            log.warn('Error getting blob from video element, falling back to database:', error)
          }
        }

        // Priority 2: Use existing media element if available (only for audio files)
        if (mediaRef?.current && !preferFFmpeg && !audioBlob) {
          const mediaElement = mediaRef.current
          log.debug('Using existing media element for extraction (audio file)')
          setProgress('Extracting audio from media element...')
          onProgress?.('Extracting audio from media element...', 10)

          try {
            audioBlob = await extractAudioFromMediaElement(mediaElement)
            targetType = 'Audio'
            targetId = currentSession.mediaId
            log.info('Audio extracted from media element', {
              size: audioBlob.size,
              type: audioBlob.type,
            })
          } catch (error) {
            log.warn('Failed to extract audio from media element, falling back to blob:', error)
            // Fall through to blob-based approach
          }
        }

        // Priority 3: Load blob from database (for video: if not from element; for audio: if not from element)
        let blob: Blob | undefined
        if (!audioBlob || !targetType || !targetId) {
          log.debug('Loading media from database')
          setProgress('Loading media from database...')
          onProgress?.('Loading media from database...', 5)

          // Get media blob from IndexedDB
          // Declare video variable in outer scope for later use
          let video: import('@/page/types/db').Video | undefined

          if (currentSession.mediaType === 'audio') {
            log.debug('Loading audio from database', { mediaId: currentSession.mediaId })
            const audio = await getCurrentDatabase().audios.get(currentSession.mediaId)
            if (!audio) {
              log.error('Audio not found in database', { mediaId: currentSession.mediaId })
              throw new Error('Audio not found')
            }

            // Priority 1: Direct blob (for TTS-generated audio)
            if (audio.blob) {
              log.debug('Using direct blob from audio record')
              blob = audio.blob
            }
            // Priority 2: Server URL (for synced media)
            else if (audio.mediaUrl) {
              log.debug('Fetching audio from server', { mediaUrl: audio.mediaUrl })
              const response = await fetch(audio.mediaUrl)
              if (!response.ok) {
                log.error('Failed to fetch audio from server', {
                  status: response.status,
                  statusText: response.statusText,
                })
                throw new Error(`Failed to fetch audio from server: ${response.statusText}`)
              }
              blob = await response.blob()
              log.debug('Audio fetched from server', { size: blob.size })
            }
            // Priority 3: Local file handle (for user-uploaded files)
            else if (audio.fileHandle) {
              log.debug('Using file handle for audio')
              blob = await audio.fileHandle.getFile()
              log.debug('Audio loaded from file handle', { size: blob.size })
            } else {
              log.error('Audio file not available', { audio })
              throw new Error('Audio file not available (no blob, mediaUrl, or fileHandle)')
            }
            targetType = 'Audio'
            targetId = currentSession.mediaId
          } else {
            log.debug('Loading video from database', { mediaId: currentSession.mediaId })
            video = await getCurrentDatabase().videos.get(currentSession.mediaId)
            if (!video) {
              log.error('Video not found in database', { mediaId: currentSession.mediaId })
              throw new Error('Video not found')
            }

            // Priority 1: Server URL (for synced media)
            if (video.mediaUrl) {
              log.debug('Fetching video from server', { mediaUrl: video.mediaUrl })
              const response = await fetch(video.mediaUrl)
              if (!response.ok) {
                log.error('Failed to fetch video from server', {
                  status: response.status,
                  statusText: response.statusText,
                })
                throw new Error(`Failed to fetch video from server: ${response.statusText}`)
              }
              blob = await response.blob()
              log.debug('Video fetched from server', { size: blob.size })
            }
            // Priority 2: Local file handle (for user-uploaded files)
            // Note: We keep video object reference to use fileHandle directly for WORKERSFS
            else if (video.fileHandle) {
              log.debug('Using file handle for video (will use for WORKERSFS if supported)')
              // For WORKERSFS, we'll pass fileHandle directly to extractAudio
              // For fallback MediaRecorder, we may need blob, so get it now
              blob = await video.fileHandle.getFile()
              log.debug('Video loaded from file handle', { size: blob.size })
            } else {
              log.error('Video file not available', { video })
              throw new Error('Video file not available (no mediaUrl or fileHandle)')
            }
            targetType = 'Video'
            targetId = currentSession.mediaId
          }

          // Extract audio if it's a video
          if (currentSession.mediaType === 'video') {
            // Use blob from video element if we got it, otherwise use blob from database
            if (!videoBlob && blob) {
              videoBlob = blob
            }

            // Get video fileHandle if available (for WORKERSFS support)
            const videoFileHandle = video?.fileHandle

            if (!videoBlob && !videoFileHandle) {
              log.error('No video blob or fileHandle available for extraction')
              throw new Error('No video blob or fileHandle available for extraction')
            }

            log.debug('Processing video file', {
              hasBlob: !!videoBlob,
              hasFileHandle: !!videoFileHandle,
              blobSize: videoBlob?.size,
              blobType: videoBlob?.type,
            })
            // Priority 1: Try FFmpeg.wasm (fast, no playback needed)
            // Always try FFmpeg first for video files (it will validate file size internally)
            // If fileHandle is available, use it directly for WORKERSFS support
            log.debug('Attempting FFmpeg.wasm extraction for video', {
              size: videoBlob?.size || 'unknown (using fileHandle)',
              hasFileHandle: !!videoFileHandle,
              limit: MAX_RECOMMENDED_FILE_SIZE,
            })
            setProgress('Extracting audio with FFmpeg...')
            onProgress?.('Extracting audio with FFmpeg...', 10)

            try {
              const ffmpegService = getFFmpegService()
              log.debug('Calling FFmpeg service to extract audio', {
                source: videoFileHandle ? 'fileHandle (WORKERSFS)' : 'blob (MEMFS)',
              })

              // Pass fileHandle if available (for WORKERSFS), otherwise pass blob (for MEMFS)
              const videoSource = videoFileHandle || videoBlob!
              const ffmpegResult = await ffmpegService.extractAudio(videoSource, (progress) => {
                // FFmpeg progress: 0-100, map to 10-80 (audio extraction phase)
                const mappedProgress = 10 + (progress * 0.7) // 10% to 80%
                setProgressPercent(mappedProgress)
                onProgress?.('Extracting audio with FFmpeg...', mappedProgress)
              })

              if (ffmpegResult.success && ffmpegResult.audioBlob) {
                audioBlob = ffmpegResult.audioBlob
                log.info('Audio extracted successfully with FFmpeg', {
                  filesystem: ffmpegResult.filesystem,
                  originalSize: videoBlob?.size || 'unknown',
                  audioSize: audioBlob.size,
                })
              } else {
                log.error('FFmpeg extraction failed', { error: ffmpegResult.error })
                // Don't throw, fall through to MediaRecorder approach
                log.debug('Falling back to MediaRecorder due to FFmpeg failure')
              }
            } catch (error) {
              log.warn('FFmpeg extraction failed, falling back to MediaRecorder:', error)
              // Fall through to MediaRecorder approach
            }

            // If FFmpeg failed or file is too large, check if we should use MediaRecorder
            if (!audioBlob && videoBlob && videoBlob.size > MAX_RECOMMENDED_FILE_SIZE) {
              log.debug('File size exceeds FFmpeg limit, using MediaRecorder', {
                size: videoBlob.size,
                limit: MAX_RECOMMENDED_FILE_SIZE,
              })
            }

            // Priority 2: Fallback to MediaRecorder (requires playback)
            // Only use MediaRecorder if we have mediaRef (for video element) or blob from database
            if (!audioBlob) {
              // Try to use media element if available (faster than creating new video element)
              if (mediaRef?.current && currentSession.mediaType === 'video') {
                log.debug('Using MediaRecorder with existing video element')
                setProgress('Extracting audio from video...')
                onProgress?.('Extracting audio from video...', 10)

                try {
                  const videoElement = mediaRef.current as HTMLVideoElement
                  const extractedBlob = await extractAudioFromMediaElement(videoElement)
                  audioBlob = extractedBlob
                  log.info('Audio extracted successfully with MediaRecorder from element', {
                    audioSize: extractedBlob.size,
                  })
                } catch (error) {
                  log.warn('Failed to extract from video element, trying blob approach:', error)
                  // Fall through to blob-based MediaRecorder
                }
              }

              // Fallback: create new video element from blob
              if (!audioBlob && videoBlob) {
                log.debug('Using MediaRecorder with video blob')
                setProgress('Extracting audio from video...')
                onProgress?.('Extracting audio from video...', 10)

                try {
                  const extractedBlob = await extractAudioFromVideo(videoBlob)
                  audioBlob = extractedBlob
                  log.info('Audio extracted successfully with MediaRecorder from blob', {
                    originalSize: videoBlob.size,
                    audioSize: extractedBlob.size,
                  })
                } catch (error) {
                  // Fallback: try to use video blob directly if extraction fails
                  log.warn('Failed to extract audio from video, using video blob directly:', error)
                  audioBlob = videoBlob
                }
              }
            }
          } else {
            // Audio file: use directly
            if (!blob) {
              log.error('No audio blob available')
              throw new Error('No audio blob available')
            }
            log.debug('Using audio file directly', { size: blob.size, type: blob.type })
            audioBlob = blob
          }
        }

        if (!audioBlob) {
          log.error('No audio blob available for transcription')
          throw new Error('No audio blob available for transcription')
        }

        log.info('Starting ASR transcription', {
          audioSize: audioBlob.size,
          audioType: audioBlob.type,
          targetType,
          targetId,
        })

        setProgress('Transcribing with ASR...')
        onProgress?.('Transcribing with ASR...', 20)

        // Get ASR configuration
        const config = getAIServiceConfig('asr')
        log.debug('ASR configuration', {
          provider: config.provider,
          model: config.localModel,
        })

        // Set up progress callback for local model
        if (config.provider === 'local') {
          // For local model, we'll listen to worker progress events
          // This will be handled by the ASR service if it supports progress callbacks
          setProgressPercent(20)
        }

        // Determine language (use provided language, session language, or undefined for auto-detect)
        const asrLanguage = language || currentSession.language || undefined
        log.debug('ASR language', { asrLanguage, provided: language, session: currentSession.language })

        // Call ASR service
        log.debug('Calling ASR service...')
        const asrResult = await asrService.transcribe({
          audioBlob,
          language: asrLanguage,
          config,
        })
        log.debug('ASR service response', {
          success: asrResult.success,
          hasData: !!asrResult.data,
          error: asrResult.error,
        })

        if (!asrResult.success || !asrResult.data) {
          log.error('ASR transcription failed', {
            error: asrResult.error,
            success: asrResult.success,
          })
          throw new Error(asrResult.error?.message || 'ASR transcription failed')
        }

        const { text, segments, timeline: asrTimeline, language: detectedLanguage } = asrResult.data

        // Calculate timeline duration for debugging
        let maxTimelineTime = 0
        if (asrTimeline && asrTimeline.length > 0) {
          maxTimelineTime = Math.max(...asrTimeline.map(t => (t.start || 0) + (t.duration || 0)))
        } else if (segments && segments.length > 0) {
          maxTimelineTime = Math.max(...segments.map(s => s.end || 0))
        }

        log.info('ASR transcription completed', {
          textLength: text.length,
          segmentsCount: segments?.length || 0,
          timelineCount: asrTimeline?.length || 0,
          maxTimelineTimeSeconds: maxTimelineTime,
          detectedLanguage,
          audioSize: audioBlob.size,
        })

        // Warn if timeline seems truncated
        if (maxTimelineTime > 0 && maxTimelineTime < 60) {
          log.warn('Timeline duration seems short - possible truncation?', {
            maxTimelineTimeSeconds: maxTimelineTime,
            audioSize: audioBlob.size,
            estimatedAudioDuration: Math.round((audioBlob.size / (192 * 1024 / 8)) * 10) / 10,
          })
        }

        // If no segments, create a single segment from the full text
        let timeline: Array<{ text: string; start: number; duration: number }>
        if (asrTimeline && asrTimeline.length > 0) {
          log.debug('Using ASR timeline', { count: asrTimeline.length })
          timeline = asrTimeline
        } else if (!segments || segments.length === 0) {
          log.debug('No segments, creating single segment from full text')
          // Fallback: create a single segment for the entire duration
          // We don't have duration info, so we'll use a placeholder
          timeline = [
            {
              text,
              start: 0,
              duration: currentSession.duration * 1000, // Convert seconds to milliseconds
            },
          ]
        } else {
          log.debug('Converting segments to timeline', { segmentsCount: segments.length })
          timeline = convertASRSegmentsToTimeline(segments)
        }
        log.debug('Final timeline', { count: timeline.length })

        // Ensure we have all required values
        if (!audioBlob) {
          throw new Error('Failed to obtain audio data for transcription')
        }
        if (!targetType || !targetId) {
          throw new Error('Failed to determine target type or ID')
        }

        log.debug('Saving transcript to database', {
          targetType,
          targetId,
          language: detectedLanguage || asrLanguage || currentSession.language || 'en',
          timelineCount: timeline.length,
        })

        setProgress('Saving transcript...')
        setProgressPercent(90)
        onProgress?.('Saving transcript...', 90)

        // Create transcript input
        const transcriptInput: TranscriptInput = {
          targetType,
          targetId,
          language: detectedLanguage || asrLanguage || currentSession.language || 'en',
          source: 'ai',
          timeline,
        }

        // Save transcript
        log.debug('Calling createTranscript mutation...')
        await createTranscript.mutateAsync(transcriptInput)
        log.info('Transcript saved successfully')

        // Update video/audio language if detected language differs
        if (detectedLanguage) {
          log.debug('Checking if language update is needed', {
            detectedLanguage,
            currentLanguage: currentSession.language,
          })
          if (currentSession.mediaType === 'video') {
            const video = await getCurrentDatabase().videos.get(currentSession.mediaId)
            if (video && video.language !== detectedLanguage) {
              log.debug('Updating video language', {
                old: video.language,
                new: detectedLanguage,
              })
              await getCurrentDatabase().videos.update(currentSession.mediaId, {
                language: detectedLanguage,
                updatedAt: new Date().toISOString(),
              })
            }
          } else {
            const audio = await getCurrentDatabase().audios.get(currentSession.mediaId)
            if (audio && audio.language !== detectedLanguage) {
              log.debug('Updating audio language', {
                old: audio.language,
                new: detectedLanguage,
              })
              await getCurrentDatabase().audios.update(currentSession.mediaId, {
                language: detectedLanguage,
                updatedAt: new Date().toISOString(),
              })
            }
          }
        }

        log.info('Retranscription completed successfully')
        setProgress(null)
        setProgressPercent(null)
        setIsTranscribing(false)
        onProgress?.('Complete', 100)

        toast.success(t('player.transcript.retranscribeSuccess', { defaultValue: 'Transcript has been regenerated successfully' }))
      } catch (error) {
        log.error('Retranscription failed:', error)
        setProgress(null)
        setProgressPercent(null)
        setIsTranscribing(false)
        onProgress?.('Error', undefined)

        // Show user-friendly error message (if not already shown)
        const errorMessage = getRetranscriptionErrorMessage(error, t)
        toast.error(errorMessage)
      }
    },
    [currentSession, createTranscript, t]
  )

  return {
    retranscribe,
    isTranscribing,
    progress,
    progressPercent,
  }
}

