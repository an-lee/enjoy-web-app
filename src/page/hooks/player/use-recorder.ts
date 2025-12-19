/**
 * useRecorder Hook
 *
 * Manages audio recording functionality using Recorder library.
 * Returns the recorded blob for external handling.
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { createLogger } from '@/shared/lib/utils'

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
// Import FrequencyHistogramView plugin and its dependencies
// @ts-ignore - recorder-core doesn't have TypeScript definitions
import 'recorder-core/src/extensions/lib.fft'
// @ts-ignore - recorder-core doesn't have TypeScript definitions
import 'recorder-core/src/extensions/frequency.histogram.view'

const log = createLogger({ name: 'useRecorder' })

interface UseRecorderOptions {
  canvasRef?: React.RefObject<HTMLElement | null> // Container element for frequency visualization (div or canvas)
}

interface RecordingResult {
  blob: Blob
  duration: number // milliseconds
}

interface UseRecorderReturn {
  isRecording: boolean
  recordingDuration: number // milliseconds
  volume: number // 0-100, for visualization
  startRecording: () => Promise<void>
  stopRecording: () => Promise<RecordingResult | null>
  cancelRecording: () => void
  error: string | null
}

export function useRecorder({
  canvasRef,
}: UseRecorderOptions = {}): UseRecorderReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [volume, setVolume] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const recorderRef = useRef<any>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const startTimeRef = useRef<number>(0)
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const frequencyViewRef = useRef<any>(null) // FrequencyHistogramView instance

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current)
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
      // Cleanup frequency view
      if (frequencyViewRef.current) {
        frequencyViewRef.current = null
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
        onProcess: (
          buffers: any,
          powerLevel: number,
          _bufferDuration: number,
          bufferSampleRate: number
        ) => {
          // Update volume for visualization (powerLevel is 0-100)
          setVolume(powerLevel)

          // Feed data to FrequencyHistogramView
          // According to the documentation, buffers is an array of Int16Array
          // We should pass the latest buffer: buffers[buffers.length-1]
          const view = frequencyViewRef.current
          if (view && buffers && Array.isArray(buffers) && buffers.length > 0) {
            try {
              const latestBuffer = buffers[buffers.length - 1]
              if (latestBuffer && latestBuffer.length > 0) {
                view.input(latestBuffer, powerLevel, bufferSampleRate || 16000)
              }
            } catch (err) {
              // Ignore errors in visualization
              log.debug('Error feeding data to FrequencyHistogramView', {
                error: err,
              })
            }
          }
        },
      })

      recorder.open(
        () => {
          // Successfully opened - initialize FrequencyHistogramView now that DOM should be ready
          // Use a small delay to ensure the container div is rendered
          setTimeout(() => {
            if (canvasRef?.current && !frequencyViewRef.current) {
              try {
                // @ts-ignore - FrequencyHistogramView doesn't have TypeScript definitions
                const frequencyView = Recorder.FrequencyHistogramView({
                  elem: canvasRef.current, // Plugin will create canvas inside this element
                  scale: 2, // Use 2x scale for better quality on high-DPI displays
                  fps: 20, // 20 FPS for smooth visualization
                  lineCount: 30, // Number of frequency bars
                  position: -1, // Draw from bottom
                  stripeEnable: true, // Enable peak indicators
                  linear: [
                    0,
                    'rgba(0,187,17,1)',
                    0.5,
                    'rgba(255,215,0,1)',
                    1,
                    'rgba(255,102,0,1)',
                  ], // Green to yellow to orange gradient
                })
                frequencyViewRef.current = frequencyView
                log.debug('FrequencyHistogramView initialized with elem')
              } catch (err) {
                log.warn('Failed to initialize FrequencyHistogramView', {
                  error: err,
                })
              }
            }
          }, 50)

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
  }, [canvasRef])

  // Helper function to cleanup recording resources
  const cleanupRecording = useCallback(() => {
    // Stop timers
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current)
      durationTimerRef.current = null
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

    // Cleanup frequency view
    if (frequencyViewRef.current) {
      frequencyViewRef.current = null
    }

    // Reset state
    setIsRecording(false)
    setVolume(0)
    setRecordingDuration(0)
  }, [])

  const stopRecording = useCallback(async (): Promise<RecordingResult | null> => {
    if (!recorderRef.current || !isRecording) {
      return null
    }

    return new Promise((resolve) => {
      // Stop timers
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current)
        durationTimerRef.current = null
      }

      // Stop recording
      recorderRef.current.stop(
        (blob: Blob, duration: number) => {
          setIsRecording(false)
          setVolume(0)

          // Cleanup
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop())
            streamRef.current = null
          }
          if (recorderRef.current) {
            recorderRef.current.close()
            recorderRef.current = null
          }
          if (frequencyViewRef.current) {
            frequencyViewRef.current = null
          }

          log.debug('Recording stopped', { duration })
          resolve({ blob, duration: Math.round(duration) })
        },
        (msg: string) => {
          setError(`Failed to stop recording: ${msg}`)
          log.error('Failed to stop recording', { msg })
          setIsRecording(false)
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop())
            streamRef.current = null
          }
          resolve(null)
        }
      )
    })
  }, [isRecording])

  const cancelRecording = useCallback(() => {
    if (!isRecording) {
      return
    }

    log.debug('Recording cancelled by user')

    // Directly cleanup without calling stop() to avoid returning data
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
