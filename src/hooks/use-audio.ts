import { useState, useEffect, useCallback } from 'react'
import { getAudioById, getAudioByTranslationKey, type Audio } from '@/db'

export type AudioLoader =
  | { type: 'id'; id: string }
  | { type: 'translationKey'; translationKey: string }

export interface UseAudioOptions {
  loader?: AudioLoader | null
  enabled?: boolean
}

export interface UseAudioReturn {
  audio: Audio | null
  audioUrl: string | null
  isLoading: boolean
  refetch: () => Promise<void>
  updateAudio: (audio: Audio | null) => void
}

/**
 * Generic hook for managing audio from database
 * Supports loading by audio ID or translation key
 * Automatically handles blob URL creation and cleanup
 */
export function useAudio(options: UseAudioOptions = {}): UseAudioReturn {
  const { loader, enabled = true } = options
  const [audio, setAudio] = useState<Audio | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const loadAudio = useCallback(async () => {
    if (!loader || !enabled) {
      setAudio(null)
      setAudioUrl(null)
      return
    }

    setIsLoading(true)
    try {
      let existingAudio: Audio | undefined

      if (loader.type === 'id') {
        existingAudio = await getAudioById(loader.id)
      } else if (loader.type === 'translationKey') {
        existingAudio = await getAudioByTranslationKey(loader.translationKey)
      }

      if (existingAudio && existingAudio.blob) {
        setAudio(existingAudio)
        const url = URL.createObjectURL(existingAudio.blob)
        setAudioUrl(url)
      } else {
        setAudio(null)
        setAudioUrl(null)
      }
    } catch (error) {
      console.error('Failed to load audio:', error)
      setAudio(null)
      setAudioUrl(null)
    } finally {
      setIsLoading(false)
    }
  }, [loader, enabled])

  // Load audio when loader changes
  useEffect(() => {
    void loadAudio()
  }, [loadAudio])

  // Clean up audio URL when component unmounts or audio changes
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [audioUrl])

  // Update audio and URL when new audio is provided
  const updateAudio = useCallback((newAudio: Audio | null) => {
    // Clean up old URL
    setAudioUrl((prevUrl) => {
      if (prevUrl) {
        URL.revokeObjectURL(prevUrl)
      }
      return null
    })

    if (newAudio && newAudio.blob) {
      setAudio(newAudio)
      const url = URL.createObjectURL(newAudio.blob)
      setAudioUrl(url)
    } else {
      setAudio(null)
      setAudioUrl(null)
    }
  }, [])

  return {
    audio,
    audioUrl,
    isLoading,
    refetch: loadAudio,
    updateAudio,
  }
}

