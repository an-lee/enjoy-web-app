/**
 * useRetranscribe Hook
 *
 * Handles retranscription of media using ASR service.
 * Supports both audio and video media types.
 * Can use existing media element if provided, otherwise falls back to blob-based approach.
 */

import { useState, useCallback, RefObject } from 'react'
import { toast } from 'sonner'
import { usePlayerStore } from '@/page/stores/player'
import { getCurrentDatabase } from '@/page/db'
import { asrService } from '@/page/ai/services/asr'
import { getAIServiceConfig } from '@/page/ai/core/config'
import { useCreateTranscript } from '@/page/hooks/queries'
import type { TranscriptInput, TargetType } from '@/page/types/db'

/**
 * Extract audio from media element using MediaRecorder API
 * This captures the audio output from an existing HTMLMediaElement
 */
async function extractAudioFromMediaElement(
  mediaElement: HTMLAudioElement | HTMLVideoElement
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // Check if element is ready
    if (mediaElement.readyState < 2) {
      // HAVE_CURRENT_DATA - need at least some data loaded
      reject(new Error('Media element not ready'))
      return
    }

    let mediaRecorder: MediaRecorder | null = null
    const chunks: Blob[] = []

    try {
      // Use captureStream if available (Chrome/Edge)
      let stream: MediaStream
      if ('captureStream' in mediaElement && typeof mediaElement.captureStream === 'function') {
        stream = mediaElement.captureStream()
      } else {
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
      if (audioTracks.length === 0) {
        reject(new Error('No audio track found in media element'))
        return
      }

      // Create MediaRecorder with audio track only
      const audioStream = new MediaStream(audioTracks)
      mediaRecorder = new MediaRecorder(audioStream, {
        mimeType: 'audio/webm;codecs=opus',
      })

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' })
        // Cleanup AudioContext if we created one
        const audioContext = (mediaElement as any)._retranscribeAudioContext
        if (audioContext) {
          audioContext.close()
          delete (mediaElement as any)._retranscribeAudioContext
        }
        resolve(audioBlob)
      }

      mediaRecorder.onerror = () => {
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

      // Reset to start and play
      mediaElement.currentTime = 0
      mediaRecorder.start()

      const playPromise = mediaElement.play()
      if (playPromise) {
        playPromise.catch((err) => {
          console.warn('Failed to play media for recording:', err)
        })
      }

      // Stop when media ends
      const handleEnded = () => {
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
    } catch (error) {
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
      URL.revokeObjectURL(objectUrl)
      video.remove()
    }

    video.onloadedmetadata = async () => {
      try {
        // Use MediaRecorder to capture audio from video
        // Create an audio context and connect the video element's audio track
        const audioContext = new AudioContext()
        const source = audioContext.createMediaElementSource(video)
        const destination = audioContext.createMediaStreamDestination()
        source.connect(destination)

        mediaRecorder = new MediaRecorder(destination.stream, {
          mimeType: 'audio/webm;codecs=opus',
        })

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data)
          }
        }

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(chunks, { type: 'audio/webm' })
          audioContext.close()
          cleanup()
          resolve(audioBlob)
        }

        mediaRecorder.onerror = () => {
          audioContext.close()
          cleanup()
          reject(new Error('MediaRecorder error'))
        }

        // Start recording and play video
        mediaRecorder.start()
        await video.play()

        // Stop when video ends
        video.onended = () => {
          if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop()
          }
        }
      } catch (error) {
        cleanup()
        reject(error)
      }
    }

    video.onerror = () => {
      cleanup()
      reject(new Error('Failed to load video'))
    }

    // Load the video
    video.load()
  })
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
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)
  const [progressPercent, setProgressPercent] = useState<number | null>(null)
  const currentSession = usePlayerStore((state) => state.currentSession)
  const createTranscript = useCreateTranscript()

  const retranscribe = useCallback(
    async (language?: string, onProgress?: (progress: string, percent?: number) => void) => {
      if (!currentSession) {
        toast.error('No media is currently playing')
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

        // Priority 1: Use existing media element if available
        if (mediaRef?.current) {
          const mediaElement = mediaRef.current
          setProgress('Extracting audio from media element...')
          onProgress?.('Extracting audio from media element...', 10)

          try {
            audioBlob = await extractAudioFromMediaElement(mediaElement)
            targetType = currentSession.mediaType === 'video' ? 'Video' : 'Audio'
            targetId = currentSession.mediaId
          } catch (error) {
            console.warn('Failed to extract audio from media element, falling back to blob:', error)
            // Fall through to blob-based approach
          }
        }

        // Priority 2: Fallback to blob-based approach
        if (!audioBlob || !targetType || !targetId) {
          setProgress('Loading media from database...')
          onProgress?.('Loading media from database...', 5)

          // Get media blob from IndexedDB
          let blob: Blob | undefined

          if (currentSession.mediaType === 'audio') {
            const audio = await getCurrentDatabase().audios.get(currentSession.mediaId)
            if (!audio) throw new Error('Audio not found')

            // Priority 1: Direct blob (for TTS-generated audio)
            if (audio.blob) {
              blob = audio.blob
            }
            // Priority 2: Server URL (for synced media)
            else if (audio.mediaUrl) {
              const response = await fetch(audio.mediaUrl)
              if (!response.ok) {
                throw new Error(`Failed to fetch audio from server: ${response.statusText}`)
              }
              blob = await response.blob()
            }
            // Priority 3: Local file handle (for user-uploaded files)
            else if (audio.fileHandle) {
              blob = await audio.fileHandle.getFile()
            } else {
              throw new Error('Audio file not available (no blob, mediaUrl, or fileHandle)')
            }
            targetType = 'Audio'
            targetId = currentSession.mediaId
          } else {
            const video = await getCurrentDatabase().videos.get(currentSession.mediaId)
            if (!video) throw new Error('Video not found')

            // Priority 1: Server URL (for synced media)
            if (video.mediaUrl) {
              const response = await fetch(video.mediaUrl)
              if (!response.ok) {
                throw new Error(`Failed to fetch video from server: ${response.statusText}`)
              }
              blob = await response.blob()
            }
            // Priority 2: Local file handle (for user-uploaded files)
            else if (video.fileHandle) {
              blob = await video.fileHandle.getFile()
            } else {
              throw new Error('Video file not available (no mediaUrl or fileHandle)')
            }
            targetType = 'Video'
            targetId = currentSession.mediaId
          }

          setProgress('Extracting audio...')
          onProgress?.('Extracting audio...', 10)

          // Extract audio if it's a video
          audioBlob = blob
          if (currentSession.mediaType === 'video') {
            try {
              audioBlob = await extractAudioFromVideo(blob)
            } catch (error) {
              // Fallback: try to use video blob directly if extraction fails
              console.warn('Failed to extract audio from video, using video blob directly:', error)
              audioBlob = blob
            }
          }
        }

        setProgress('Transcribing with ASR...')
        onProgress?.('Transcribing with ASR...', 20)

        // Get ASR configuration
        const config = getAIServiceConfig('asr')

        // Set up progress callback for local model
        if (config.provider === 'local') {
          // For local model, we'll listen to worker progress events
          // This will be handled by the ASR service if it supports progress callbacks
          setProgressPercent(20)
        }

        // Determine language (use provided language, session language, or undefined for auto-detect)
        const asrLanguage = language || currentSession.language || undefined

        // Call ASR service
        const asrResult = await asrService.transcribe({
          audioBlob,
          language: asrLanguage,
          config,
        })

        if (!asrResult.success || !asrResult.data) {
          throw new Error(asrResult.error?.message || 'ASR transcription failed')
        }

        const { text, segments, timeline: asrTimeline, language: detectedLanguage } = asrResult.data

        // If no segments, create a single segment from the full text
        let timeline: Array<{ text: string; start: number; duration: number }>
        if (asrTimeline && asrTimeline.length > 0) {
          timeline = asrTimeline
        } else if (!segments || segments.length === 0) {
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
          timeline = convertASRSegmentsToTimeline(segments)
        }

        // Ensure we have all required values
        if (!audioBlob) {
          throw new Error('Failed to obtain audio data for transcription')
        }
        if (!targetType || !targetId) {
          throw new Error('Failed to determine target type or ID')
        }

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
        await createTranscript.mutateAsync(transcriptInput)

        // Update video/audio language if detected language differs
        if (detectedLanguage) {
          if (currentSession.mediaType === 'video') {
            const video = await getCurrentDatabase().videos.get(currentSession.mediaId)
            if (video && video.language !== detectedLanguage) {
              await getCurrentDatabase().videos.update(currentSession.mediaId, {
                language: detectedLanguage,
                updatedAt: new Date().toISOString(),
              })
            }
          } else {
            const audio = await getCurrentDatabase().audios.get(currentSession.mediaId)
            if (audio && audio.language !== detectedLanguage) {
              await getCurrentDatabase().audios.update(currentSession.mediaId, {
                language: detectedLanguage,
                updatedAt: new Date().toISOString(),
              })
            }
          }
        }

        setProgress(null)
        setProgressPercent(null)
        setIsTranscribing(false)
        onProgress?.('Complete', 100)

        toast.success('Transcript has been regenerated successfully')
      } catch (error) {
        setProgress(null)
        setProgressPercent(null)
        setIsTranscribing(false)
        onProgress?.('Error', undefined)

        const errorMessage =
          error instanceof Error ? error.message : 'Failed to retranscribe media'
        toast.error(errorMessage)
      }
    },
    [currentSession, createTranscript]
  )

  return {
    retranscribe,
    isTranscribing,
    progress,
    progressPercent,
  }
}

