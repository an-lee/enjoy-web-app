/**
 * Audio Query Hooks - React Query hooks for Audio entity
 *
 * Provides hooks for:
 * - Single audio fetch (by ID or translation key)
 * - Multiple audios fetch (by translation key, history)
 * - Audio mutations (save, delete)
 */

import { useEffect, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  db,
  getAudioById,
  getAudioByTranslationKey,
  getAudiosByTranslationKey,
  saveAudio,
  deleteAudio,
} from '@/db'
import type { Audio, AudioInput } from '@/types/db'

const MAX_HISTORY_ITEMS = 50

// ============================================================================
// Query Keys Factory
// ============================================================================

export const audioQueryKeys = {
  all: ['audio'] as const,
  detail: (id: string) => [...audioQueryKeys.all, 'detail', id] as const,
  byTranslationKey: (translationKey: string) =>
    [...audioQueryKeys.all, 'byTranslationKey', translationKey] as const,
  list: () => [...audioQueryKeys.all, 'list'] as const,
  history: (searchQuery?: string) =>
    [...audioQueryKeys.list(), 'history', searchQuery || ''] as const,
  listByTranslationKey: (translationKey: string) =>
    [...audioQueryKeys.list(), 'byTranslationKey', translationKey] as const,
}

// ============================================================================
// Types
// ============================================================================

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

export interface AudioWithUrl {
  audio: Audio
  audioUrl: string
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

// ============================================================================
// Helper Functions
// ============================================================================

function createAudioUrl(audio: Audio | undefined | null): string | null {
  if (!audio?.blob) return null
  return URL.createObjectURL(audio.blob)
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
      const dateA = a.audio.createdAt || ''
      const dateB = b.audio.createdAt || ''
      return dateB.localeCompare(dateA) // Newest first
    })
}

// ============================================================================
// Fetch Functions
// ============================================================================

async function fetchAudio(loader: AudioLoader): Promise<Audio | undefined> {
  if (loader.type === 'id') {
    return getAudioById(loader.id)
  } else if (loader.type === 'translationKey') {
    return getAudioByTranslationKey(loader.translationKey)
  }
  return undefined
}

function getQueryKey(loader: AudioLoader) {
  if (loader.type === 'id') {
    return audioQueryKeys.detail(loader.id)
  } else {
    return audioQueryKeys.byTranslationKey(loader.translationKey)
  }
}

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
    return filtered.slice(0, MAX_HISTORY_ITEMS)
  }

  return ttsAudios.slice(0, MAX_HISTORY_ITEMS)
}

async function fetchAudiosByTranslationKey(
  translationKey: string
): Promise<Audio[]> {
  return getAudiosByTranslationKey(translationKey)
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Hook for fetching a single audio
 * Supports loading by audio ID or translation key
 * Automatically handles blob URL creation and cleanup
 */
export function useAudio(options: UseAudioOptions = {}): UseAudioReturn {
  const { loader, enabled = true } = options
  const queryClient = useQueryClient()

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
    staleTime: 1000 * 30,
  })

  const audioUrl = useMemo(() => createAudioUrl(audio), [audio])

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [audioUrl])

  const refetch = useCallback(async () => {
    await refetchQuery()
  }, [refetchQuery])

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

/**
 * Hook for fetching audio history (TTS generated audios)
 */
export function useAudioHistory(
  enabled: boolean = true,
  searchQuery?: string
) {
  return useQuery({
    queryKey: audioQueryKeys.history(searchQuery),
    queryFn: () => fetchAudioHistory(searchQuery),
    enabled,
    staleTime: 1000 * 30,
  })
}

/**
 * Hook for fetching multiple audios by translation key
 * Automatically handles blob URL creation and cleanup
 */
export function useAudios(options: UseAudiosOptions = {}): UseAudiosReturn {
  const { translationKey, enabled = true } = options
  const queryClient = useQueryClient()

  const {
    data: audioList = [],
    isLoading,
    isError,
    error,
    refetch: refetchQuery,
  } = useQuery({
    queryKey: translationKey
      ? audioQueryKeys.listByTranslationKey(translationKey)
      : ['audios', 'empty'],
    queryFn: () => {
      if (!translationKey) return Promise.resolve([])
      return fetchAudiosByTranslationKey(translationKey)
    },
    enabled: enabled && !!translationKey,
    staleTime: 1000 * 30,
  })

  const audios = useMemo(() => createAudiosWithUrls(audioList), [audioList])

  useEffect(() => {
    return () => {
      audios.forEach(({ audioUrl }) => {
        URL.revokeObjectURL(audioUrl)
      })
    }
  }, [audios])

  const refetch = useCallback(async () => {
    await refetchQuery()
  }, [refetchQuery])

  const addAudio = useCallback(
    (newAudio: Audio) => {
      if (!translationKey || !newAudio.blob) return

      const queryKey = audioQueryKeys.listByTranslationKey(translationKey)
      queryClient.setQueryData<Audio[]>(queryKey, (oldData = []) => {
        if (oldData.some((audio) => audio.id === newAudio.id)) {
          return oldData
        }
        return [newAudio, ...oldData]
      })
    },
    [translationKey, queryClient]
  )

  const removeAudio = useCallback(
    (audioId: string) => {
      if (!translationKey) return

      const queryKey = audioQueryKeys.listByTranslationKey(translationKey)
      queryClient.setQueryData<Audio[]>(queryKey, (oldData = []) => {
        return oldData.filter((audio) => audio.id !== audioId)
      })
    },
    [translationKey, queryClient]
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
      const audio: Audio = {
        ...input,
        id,
        aid: id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Audio
      return { id, audio }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: audioQueryKeys.history() })

      if (result.audio.translationKey) {
        queryClient.invalidateQueries({
          queryKey: audioQueryKeys.listByTranslationKey(result.audio.translationKey),
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
      queryClient.invalidateQueries({ queryKey: audioQueryKeys.history() })

      if (variables.translationKey) {
        queryClient.invalidateQueries({
          queryKey: audioQueryKeys.listByTranslationKey(variables.translationKey),
        })
      }
    },
  })
}

