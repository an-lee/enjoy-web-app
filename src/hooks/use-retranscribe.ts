/**
 * useRetranscribe Hook
 *
 * Handles retranscription of media using ASR service.
 * Supports both audio and video media types.
 */

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { usePlayerStore } from '@/stores/player'
import { db } from '@/db'
import { asrService } from '@/ai/services/asr'
import { getAIServiceConfig } from '@/ai/core/config'
import { useCreateTranscript } from '@/hooks/queries'
import type { TranscriptInput, TargetType } from '@/types/db'

/**
 * Extract audio from video blob using MediaRecorder API
 * This creates a video element, captures its audio track, and records it
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

export function useRetranscribe() {
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
        // Get media blob from IndexedDB
        let blob: Blob | undefined
        let targetType: TargetType
        let targetId: string

        if (currentSession.mediaType === 'audio') {
          const audio = await db.audios.get(currentSession.mediaId)
          if (!audio) throw new Error('Audio not found')
          // Get blob from audio (for TTS) or fileHandle
          if (audio.blob) {
            blob = audio.blob
          } else if (audio.fileHandle) {
            blob = await audio.fileHandle.getFile()
          } else {
            throw new Error('Audio file not available')
          }
          targetType = 'Audio'
          targetId = currentSession.mediaId
        } else {
          const video = await db.videos.get(currentSession.mediaId)
          if (!video) throw new Error('Video not found')
          // Get file from fileHandle
          if (video.fileHandle) {
            blob = await video.fileHandle.getFile()
          } else {
            throw new Error('Video file not available')
          }
          targetType = 'Video'
          targetId = currentSession.mediaId
        }

        setProgress('Extracting audio...')
        onProgress?.('Extracting audio...', 10)

        // Extract audio if it's a video
        let audioBlob: Blob = blob
        if (currentSession.mediaType === 'video') {
          try {
            audioBlob = await extractAudioFromVideo(blob)
          } catch (error) {
            // Fallback: try to use video blob directly if extraction fails
            console.warn('Failed to extract audio from video, using video blob directly:', error)
            audioBlob = blob
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
            const video = await db.videos.get(currentSession.mediaId)
            if (video && video.language !== detectedLanguage) {
              await db.videos.update(currentSession.mediaId, {
                language: detectedLanguage,
                updatedAt: new Date().toISOString(),
              })
            }
          } else {
            const audio = await db.audios.get(currentSession.mediaId)
            if (audio && audio.language !== detectedLanguage) {
              await db.audios.update(currentSession.mediaId, {
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

