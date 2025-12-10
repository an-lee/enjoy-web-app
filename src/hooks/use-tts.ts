import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { ttsService } from '@/ai/services'
import { getAIServiceConfig } from '@/ai/core/config'
import { useCreateAudio, useCreateTranscript } from './queries'
import type { Audio, TTSAudioInput, TranscriptInput } from '@/types/db'

export interface UseTTSOptions {
  language: string
  voice: string
  translationKey?: string
  onSuccess?: (audio: Audio, audioUrl: string) => void
  onError?: (error: Error) => void
}

export interface UseTTSReturn {
  isSynthesizing: boolean
  synthesize: (text: string) => Promise<void>
  reset: () => void
}

/**
 * Hook for text-to-speech synthesis
 * Handles TTS synthesis, audio saving, and URL management
 * Uses React Query mutations for database operations
 */
export function useTTS(options: UseTTSOptions): UseTTSReturn {
  const { language, voice, translationKey, onSuccess, onError } = options
  const { t } = useTranslation()
  const [isSynthesizing, setIsSynthesizing] = useState(false)

  // React Query mutations
  const createAudioMutation = useCreateAudio()
  const createTranscriptMutation = useCreateTranscript()

  const synthesize = useCallback(
    async (text: string) => {
      if (!text.trim()) return

      setIsSynthesizing(true)

      try {
        const config = getAIServiceConfig('tts')
        const result = await ttsService.synthesize({
          text: text.trim(),
          language,
          voice,
          config,
        })

        if (!result.success || !result.data) {
          throw new Error(result.error?.message || t('tts.error'))
        }

        const blob = result.data.audioBlob
        if (!blob) {
          throw new Error(t('tts.noAudioGenerated'))
        }

        // Create audio URL
        const url = URL.createObjectURL(blob)

        // Get audio duration
        const audioElement = new Audio(url)
        await new Promise<void>((resolve, reject) => {
          audioElement.addEventListener('loadedmetadata', () => resolve())
          audioElement.addEventListener('error', reject)
        })
        const duration = audioElement.duration || 0
        audioElement.remove()

        // Save to database using React Query mutation
        const ttsInput: TTSAudioInput = {
          provider: 'tts',
          title: text.substring(0, 100),
          duration, // seconds
          language,
          sourceText: text,
          voice,
          blob,
          translationKey,
          syncStatus: 'local',
        }
        const { audio } = await createAudioMutation.mutateAsync(ttsInput)

        // Save transcript if available (from TTS timestamped model)
        if (
          result.data.transcript?.timeline &&
          result.data.transcript.timeline.length > 0
        ) {
          const transcriptInput: TranscriptInput = {
            targetType: 'Audio',
            targetId: audio.id,
            language,
            source: 'ai',
            timeline: result.data.transcript.timeline,
            syncStatus: 'local',
          }
          await createTranscriptMutation.mutateAsync(transcriptInput)
        }

        toast.success(
          t('tts.synthesized', { defaultValue: 'Audio synthesized successfully' })
        )

        onSuccess?.(audio, url)
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error))
        console.error('TTS synthesis failed:', err)
        toast.error(t('tts.error'))
        onError?.(err)
      } finally {
        setIsSynthesizing(false)
      }
    },
    [
      language,
      voice,
      translationKey,
      t,
      onSuccess,
      onError,
      createAudioMutation,
      createTranscriptMutation,
    ]
  )

  const reset = useCallback(() => {
    setIsSynthesizing(false)
  }, [])

  return {
    isSynthesizing,
    synthesize,
    reset,
  }
}
