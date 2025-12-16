/**
 * useShadowRecording Hook
 *
 * Manages shadow reading recording functionality using Recorder library.
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { createLogger } from '@/lib/utils'
import { recordingRepository } from '@/db/repositories/recording-repository'
import type { RecordingInput, TargetType } from '@/types/db'

// Import Recorder library
// @ts-ignore - recorder-core doesn't have TypeScript definitions
import Recorder from 'recorder-core'
// @ts-ignore - recorder-core doesn't have TypeScript definitions
import 'recorder-core/src/engine/wav'
// @ts-ignore - recorder-core doesn't have TypeScript definitions
// Must import mp3-engine.js before mp3.js
import 'recorder-core/src/engine/mp3-engine'
// @ts-ignore - recorder-core doesn't have TypeScript definitions
import 'recorder-core/src/engine/mp3'

const log = createLogger({ name: 'useShadowRecording' })

interface UseShadowRecordingOptions {
  startTime: number // milliseconds
  endTime: number // milliseconds
  referenceText: string
  language: string
  targetType: TargetType
  targetId: string
}

interface UseShadowRecordingReturn {
  isRecording: boolean
  recordingDuration: number // milliseconds
  volume: number // 0-100, for visualization
  startRecording: () => Promise<void>
  stopRecording: () => Promise<void>
  cancelRecording: () => void
  error: string | null
}

export function useShadowRecording({
  startTime,
  endTime,
  referenceText,
  language,
  targetType,
  targetId,
}: UseShadowRecordingOptions): UseShadowRecordingReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [volume, setVolume] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const recorderRef = useRef<any>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const startTimeRef = useRef<number>(0)
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const volumeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current)
      }
      if (volumeTimerRef.current) {
        clearInterval(volumeTimerRef.current)
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
      if (recorderRef.current) {
        try {
          recorderRef.current.stop()
          recorderRef.current.close()
        } catch (e) {
          // Ignore errors during cleanup
        }
        recorderRef.current = null
      }
    }
  }, [])

  const startRecording = useCallback(async () => {
    try {
      setError(null)
      setRecordingDuration(0)
      setVolume(0)

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Initialize Recorder
      // @ts-ignore - recorder-core doesn't have TypeScript definitions
      const recorder = Recorder({
        type: 'mp3', // Use MP3 format for smaller file size
        sampleRate: 16000, // 16kHz is sufficient for speech
        bitRate: 16, // 16kbps for smaller files
        onProcess: (_buffers: any, powerLevel: number) => {
          // Update volume for visualization (powerLevel is 0-100)
          setVolume(powerLevel)
        },
      })

      recorder.open(
        () => {
          // Successfully opened
          recorder.start()
          recorderRef.current = recorder
          setIsRecording(true)
          startTimeRef.current = Date.now()

          // Update duration every 100ms
          durationTimerRef.current = setInterval(() => {
            const elapsed = Date.now() - startTimeRef.current
            setRecordingDuration(elapsed)
          }, 100)

          log.debug('Recording started')
        },
        (msg: string) => {
          // Failed to open
          setError(`Failed to start recording: ${msg}`)
          log.error('Failed to open recorder', { msg })
          stream.getTracks().forEach((track) => track.stop())
        }
      )
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to access microphone'
      setError(errorMsg)
      log.error('Failed to start recording', { error: err })
    }
  }, [])

  // Helper function to cleanup recording resources
  const cleanupRecording = useCallback(() => {
    // Stop timers
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current)
      durationTimerRef.current = null
    }
    if (volumeTimerRef.current) {
      clearInterval(volumeTimerRef.current)
      volumeTimerRef.current = null
    }

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    // Close recorder
    if (recorderRef.current) {
      try {
        recorderRef.current.close()
      } catch (e) {
        // Ignore errors during cleanup
      }
      recorderRef.current = null
    }

    // Reset state
    setIsRecording(false)
    setVolume(0)
    setRecordingDuration(0)
  }, [])

  const stopRecording = useCallback(async () => {
    if (!recorderRef.current || !isRecording) {
      return
    }

    try {
      // Stop timers
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current)
        durationTimerRef.current = null
      }
      if (volumeTimerRef.current) {
        clearInterval(volumeTimerRef.current)
        volumeTimerRef.current = null
      }

      // Stop recording
      recorderRef.current.stop(
        async (blob: Blob, duration: number) => {
          try {
            setIsRecording(false)
            setVolume(0)

            // Calculate SHA-256 hash of the blob (MD5 is not supported in browser crypto API)
            // We'll use SHA-256 and store it in md5 field for compatibility
            const arrayBuffer = await blob.arrayBuffer()
            const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
            const hashArray = Array.from(new Uint8Array(hashBuffer))
            const md5 = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')

            // Create recording input
            const recordingInput: RecordingInput = {
              targetType,
              targetId,
              referenceStart: startTime,
              referenceDuration: endTime - startTime,
              referenceText,
              language,
              duration: Math.round(duration), // Convert to milliseconds
              md5,
              blob,
              syncStatus: 'pending',
            }

            // Save to database
            const recordingId = await recordingRepository.save(recordingInput)
            log.debug('Recording saved', { recordingId, duration })

            // Cleanup
            if (streamRef.current) {
              streamRef.current.getTracks().forEach((track) => track.stop())
              streamRef.current = null
            }
            recorderRef.current.close()
            recorderRef.current = null
          } catch (err: any) {
            setError(`Failed to save recording: ${err?.message || 'Unknown error'}`)
            log.error('Failed to save recording', { error: err })
          }
        },
        (msg: string) => {
          setError(`Failed to stop recording: ${msg}`)
          log.error('Failed to stop recording', { msg })
          setIsRecording(false)
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop())
            streamRef.current = null
          }
        }
      )
    } catch (err: any) {
      setError(`Failed to stop recording: ${err?.message || 'Unknown error'}`)
      log.error('Failed to stop recording', { error: err })
      setIsRecording(false)
    }
  }, [isRecording, startTime, endTime, referenceText, language, targetType, targetId])

  const cancelRecording = useCallback(() => {
    if (!isRecording) {
      return
    }

    log.debug('Recording cancelled by user')

    // Directly cleanup without calling stop() to avoid saving
    // We just close the recorder and stop the stream
    cleanupRecording()
  }, [isRecording, cleanupRecording])

  return {
    isRecording,
    recordingDuration,
    volume,
    startRecording,
    stopRecording,
    cancelRecording,
    error,
  }
}

