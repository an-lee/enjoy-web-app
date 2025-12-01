import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { ttsService } from '@/services/ai/services'
import { getAIServiceConfig } from '@/services/ai/core/config'
import { saveAudio, type Audio } from '@/db'
import { VideoProvider } from '@/db/schema'

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
 */
export function useTTS(options: UseTTSOptions): UseTTSReturn {
  const { language, voice, translationKey, onSuccess, onError } = options
  const { t } = useTranslation()
  const [isSynthesizing, setIsSynthesizing] = useState(false)

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

        // Save to database
        const audioId = `tts-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
        const audioRecord: Omit<Audio, 'createdAt' | 'updatedAt'> = {
          id: audioId,
          title: text.substring(0, 100),
          duration,
          language,
          provider: 'other' as VideoProvider,
          sourceText: text,
          voice,
          blob,
          translationKey,
          syncStatus: 'local',
        }

        await saveAudio(audioRecord)
        const audio: Audio = {
          ...audioRecord,
          createdAt: Date.now(),
          updatedAt: Date.now(),
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
    [language, voice, translationKey, t, onSuccess, onError]
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

