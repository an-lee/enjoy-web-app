import { useEffect, useMemo, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getAudioById, getAudioByTranslationKey } from '@/db'
import type { Audio } from '@/types/db'

// Query keys factory
export const audioKeys = {
  all: ['audio'] as const,
  detail: (id: string) => [...audioKeys.all, 'detail', id] as const,
  byTranslationKey: (translationKey: string) =>
    [...audioKeys.all, 'byTranslationKey', translationKey] as const,
}

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
  isError: boolean
  error: Error | null
  refetch: () => Promise<void>
  updateAudio: (audio: Audio | null) => void
}

// Helper to create audio URL from blob
function createAudioUrl(audio: Audio | undefined | null): string | null {
  if (!audio?.blob) return null
  return URL.createObjectURL(audio.blob)
}

// Fetch function for audio by loader
async function fetchAudio(loader: AudioLoader): Promise<Audio | undefined> {
  if (loader.type === 'id') {
    return getAudioById(loader.id)
  } else if (loader.type === 'translationKey') {
    return getAudioByTranslationKey(loader.translationKey)
  }
  return undefined
}

// Get query key based on loader
function getQueryKey(loader: AudioLoader) {
  if (loader.type === 'id') {
    return audioKeys.detail(loader.id)
  } else {
    return audioKeys.byTranslationKey(loader.translationKey)
  }
}

/**
 * Generic hook for managing audio from database
 * Supports loading by audio ID or translation key
 * Uses React Query for data fetching and caching
 * Automatically handles blob URL creation and cleanup
 */
export function useAudio(options: UseAudioOptions = {}): UseAudioReturn {
  const { loader, enabled = true } = options
  const queryClient = useQueryClient()

  // Query for audio
  const {
    data: audio,
    isLoading,
    isError,
    error,
    refetch: refetchQuery,
  } = useQuery({
    queryKey: loader ? getQueryKey(loader) : ['audio', 'none'],
    queryFn: () => {
      if (!loader) return Promise.resolve(undefined)
      return fetchAudio(loader)
    },
    enabled: enabled && !!loader,
    staleTime: 1000 * 30, // 30 seconds
  })

  // Create audio URL from blob and memoize
  const audioUrl = useMemo(() => {
    return createAudioUrl(audio)
  }, [audio])

  // Clean up audio URL when it changes or component unmounts
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [audioUrl])

  // Refetch wrapper
  const refetch = useCallback(async () => {
    await refetchQuery()
  }, [refetchQuery])

  // Update audio in cache (optimistic update)
  const updateAudio = useCallback(
    (newAudio: Audio | null) => {
      if (!loader) return

      const queryKey = getQueryKey(loader)
      queryClient.setQueryData(queryKey, newAudio ?? undefined)
    },
    [loader, queryClient]
  )

  return {
    audio: audio ?? null,
    audioUrl,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
    updateAudio,
  }
}
