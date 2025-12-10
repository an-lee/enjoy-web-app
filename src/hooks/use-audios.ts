import { useEffect, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  db,
  getAudiosByTranslationKey,
  saveAudio,
  deleteAudio,
} from '@/db'
import type { Audio, AudioInput } from '@/types/db'

const MAX_ITEMS = 50

// Query keys factory
export const audioKeys = {
  all: ['audios'] as const,
  history: (searchQuery?: string) =>
    [...audioKeys.all, 'history', searchQuery || ''] as const,
  byTranslationKey: (translationKey: string) =>
    [...audioKeys.all, 'byTranslationKey', translationKey] as const,
}

// Helper to create AudioWithUrl from Audio
export interface AudioWithUrl {
  audio: Audio
  audioUrl: string
}

function createAudioWithUrl(audio: Audio): AudioWithUrl | null {
  if (!audio.blob) return null
  return {
    audio,
    audioUrl: URL.createObjectURL(audio.blob),
  }
}

function createAudiosWithUrls(audios: Audio[]): AudioWithUrl[] {
  return audios
    .map(createAudioWithUrl)
    .filter((item): item is AudioWithUrl => item !== null)
    .sort((a, b) => {
      // Sort by createdAt (ISO 8601 strings compare correctly)
      const dateA = a.audio.createdAt || ''
      const dateB = b.audio.createdAt || ''
      return dateB.localeCompare(dateA) // Newest first
    })
}

// Fetch functions
async function fetchAudioHistory(searchQuery?: string): Promise<Audio[]> {
  const query = db.audios.orderBy('createdAt').reverse()
  const allAudios = await query.toArray()

  // Filter to TTS audios (those with sourceText)
  const ttsAudios = allAudios.filter((audio) => audio.sourceText)

  if (searchQuery && searchQuery.trim()) {
    const searchTerm = searchQuery.toLowerCase().trim()
    const filtered = ttsAudios.filter((item) =>
      (item.sourceText || '').toLowerCase().includes(searchTerm)
    )
    return filtered.slice(0, MAX_ITEMS)
  }

  return ttsAudios.slice(0, MAX_ITEMS)
}

async function fetchAudiosByTranslationKey(
  translationKey: string
): Promise<Audio[]> {
  return getAudiosByTranslationKey(translationKey)
}

// Hooks
export function useAudioHistory(
  enabled: boolean = true,
  searchQuery?: string
) {
  return useQuery({
    queryKey: audioKeys.history(searchQuery),
    queryFn: () => fetchAudioHistory(searchQuery),
    enabled,
    staleTime: 1000 * 30,
  })
}

export interface UseAudiosOptions {
  translationKey?: string | null
  enabled?: boolean
}

export interface UseAudiosReturn {
  audios: AudioWithUrl[]
  isLoading: boolean
  isError: boolean
  error: Error | null
  refetch: () => Promise<void>
  addAudio: (audio: Audio) => void
  removeAudio: (audioId: string) => void
}

/**
 * Generic hook for managing multiple audio files
 * Uses react-query for data fetching and caching
 * Supports loading audios by translation key
 * Automatically handles blob URL creation and cleanup
 */
export function useAudios(options: UseAudiosOptions = {}): UseAudiosReturn {
  const { translationKey, enabled = true } = options
  const queryClient = useQueryClient()

  // Query for audio list
  const {
    data: audioList = [],
    isLoading,
    isError,
    error,
    refetch: refetchQuery,
  } = useQuery({
    queryKey: translationKey
      ? audioKeys.byTranslationKey(translationKey)
      : ['audios', 'empty'],
    queryFn: () => {
      if (!translationKey) {
        return Promise.resolve([])
      }
      return fetchAudiosByTranslationKey(translationKey)
    },
    enabled: enabled && !!translationKey,
    staleTime: 1000 * 30,
  })

  // Convert Audio[] to AudioWithUrl[] and memoize
  const audios = useMemo(() => {
    return createAudiosWithUrls(audioList)
  }, [audioList])

  // Clean up blob URLs when audios change or component unmounts
  useEffect(() => {
    return () => {
      audios.forEach(({ audioUrl }) => {
        URL.revokeObjectURL(audioUrl)
      })
    }
  }, [audios])

  // Refetch wrapper
  const refetch = useCallback(async () => {
    await refetchQuery()
  }, [refetchQuery])

  // Add audio to the list (optimistic update)
  const addAudio = useCallback(
    (newAudio: Audio) => {
      if (!translationKey || !newAudio.blob) return

      const queryKey = audioKeys.byTranslationKey(translationKey)

      // Optimistic update: add to cache
      queryClient.setQueryData<Audio[]>(queryKey, (oldData = []) => {
        // Check if audio already exists
        if (oldData.some((audio) => audio.id === newAudio.id)) {
          return oldData
        }
        // Add to the beginning (newest first)
        return [newAudio, ...oldData]
      })
    },
    [translationKey, queryClient]
  )

  // Remove audio from the list (optimistic update)
  const removeAudio = useCallback(
    (audioId: string) => {
      if (!translationKey) return

      const queryKey = audioKeys.byTranslationKey(translationKey)

      // Optimistic update: remove from cache
      queryClient.setQueryData<Audio[]>(queryKey, (oldData = []) => {
        return oldData.filter((audio) => audio.id !== audioId)
      })

      // Clean up blob URL for removed audio
      const removedAudio = audioList.find((audio) => audio.id === audioId)
      if (removedAudio?.blob) {
        // Note: We can't revoke the URL here because it might be in use
        // The cleanup effect will handle it when the component unmounts
      }
    },
    [translationKey, queryClient, audioList]
  )

  return {
    audios,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
    addAudio,
    removeAudio,
  }
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Hook to save a new audio to the database
 */
export function useSaveAudio() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: AudioInput): Promise<{ id: string; audio: Audio }> => {
      const id = await saveAudio(input)
      // Construct the audio record for callback
      const audio: Audio = {
        ...input,
        id,
        aid: id, // For TTS audio, aid is same as id
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Audio
      return { id, audio }
    },
    onSuccess: (result) => {
      // Invalidate history queries to refresh
      queryClient.invalidateQueries({ queryKey: audioKeys.history() })

      // If the audio has a translationKey, also invalidate that query
      if (result.audio.translationKey) {
        queryClient.invalidateQueries({
          queryKey: audioKeys.byTranslationKey(result.audio.translationKey),
        })
      }
    },
  })
}

/**
 * Hook to delete an audio from the database
 */
export function useDeleteAudio() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      audioId,
    }: {
      audioId: string
      translationKey?: string
    }): Promise<void> => {
      await deleteAudio(audioId)
    },
    onSuccess: (_, variables) => {
      // Invalidate history queries to refresh
      queryClient.invalidateQueries({ queryKey: audioKeys.history() })

      // If the audio had a translationKey, also invalidate that query
      if (variables.translationKey) {
        queryClient.invalidateQueries({
          queryKey: audioKeys.byTranslationKey(variables.translationKey),
        })
      }
    },
  })
}
