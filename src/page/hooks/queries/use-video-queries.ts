/**
 * Video Query Hooks - React Query hooks for Video entity
 *
 * CRUD Operations:
 * - Read: useVideo, useVideos, useVideosByProvider
 * - Create: useCreateVideo, useSaveLocalVideo
 * - Update: useUpdateVideo
 * - Delete: useDeleteVideo
 */

import { useCallback, useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  db,
  getVideoById,
  getVideosByProvider,
  saveVideo,
  saveLocalVideo,
  updateVideo,
  deleteVideo,
} from '@/page/db'
import type { Video, VideoInput, VideoProvider } from '@/page/types/db'

// ============================================================================
// Query Keys Factory
// ============================================================================

export const videoQueryKeys = {
  all: ['video'] as const,
  detail: (id: string) => [...videoQueryKeys.all, 'detail', id] as const,
  list: () => [...videoQueryKeys.all, 'list'] as const,
  byProvider: (provider: VideoProvider) =>
    [...videoQueryKeys.list(), 'byProvider', provider] as const,
  search: (query: string, provider?: VideoProvider) =>
    [...videoQueryKeys.list(), 'search', query, provider || 'all'] as const,
}

// ============================================================================
// Types
// ============================================================================

export interface VideoWithUrl {
  video: Video
  videoUrl: string | null
  thumbnailUrl: string | null
}

export interface UseVideoOptions {
  id?: string | null
  enabled?: boolean
}

export interface UseVideoReturn {
  video: Video | null
  videoUrl: string | null
  isLoading: boolean
  isError: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export interface UseVideosOptions {
  provider?: VideoProvider
  enabled?: boolean
}

// ============================================================================
// Helper Functions
// ============================================================================

import { getMediaUrl } from '@/page/lib/file-access'

async function createVideoUrl(video: Video | undefined | null): Promise<string | null> {
  if (!video) return null
  try {
    return await getMediaUrl(video)
  } catch {
    return null
  }
}

// Future use: when video list needs URLs
// function createVideoWithUrl(video: Video): VideoWithUrl {
//   return {
//     video,
//     videoUrl: video.blob ? URL.createObjectURL(video.blob) : null,
//     thumbnailUrl: video.thumbnailUrl || null,
//   }
// }

// ============================================================================
// Fetch Functions
// ============================================================================

async function fetchVideo(id: string): Promise<Video | undefined> {
  return getVideoById(id)
}

async function fetchVideosByProvider(provider: VideoProvider): Promise<Video[]> {
  return getVideosByProvider(provider)
}

async function fetchAllVideos(): Promise<Video[]> {
  return db.videos.orderBy('createdAt').reverse().toArray()
}

// ============================================================================
// Query Hooks (Read Operations)
// ============================================================================

/**
 * Hook for fetching a single video by ID
 * Automatically handles blob URL creation and cleanup
 */
export function useVideo(options: UseVideoOptions = {}): UseVideoReturn {
  const { id, enabled = true } = options

  const {
    data: video,
    isLoading,
    isError,
    error,
    refetch: refetchQuery,
  } = useQuery({
    queryKey: id ? videoQueryKeys.detail(id) : ['video', 'none'],
    queryFn: () => {
      if (!id) return Promise.resolve(undefined)
      return fetchVideo(id)
    },
    enabled: enabled && !!id,
    staleTime: 1000 * 30,
  })

  const [videoUrl, setVideoUrl] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    let url: string | null = null

    createVideoUrl(video).then((result) => {
      if (mounted) {
        url = result
        setVideoUrl(result)
      }
    })

    return () => {
      mounted = false
      if (url) {
        URL.revokeObjectURL(url)
      }
    }
  }, [video])

  const refetch = useCallback(async () => {
    await refetchQuery()
  }, [refetchQuery])

  return {
    video: video ?? null,
    videoUrl,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  }
}

/**
 * Hook for fetching all videos or videos by provider
 */
export function useVideos(options: UseVideosOptions = {}) {
  const { provider, enabled = true } = options

  return useQuery({
    queryKey: provider ? videoQueryKeys.byProvider(provider) : videoQueryKeys.list(),
    queryFn: () => (provider ? fetchVideosByProvider(provider) : fetchAllVideos()),
    enabled,
    staleTime: 1000 * 30,
  })
}

/**
 * Hook for fetching videos by provider
 */
export function useVideosByProvider(
  provider: VideoProvider,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: videoQueryKeys.byProvider(provider),
    queryFn: () => fetchVideosByProvider(provider),
    enabled,
    staleTime: 1000 * 30,
  })
}

// ============================================================================
// Mutation Hooks (Create/Update/Delete Operations)
// ============================================================================

/**
 * Hook to create a new video
 */
export function useCreateVideo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: VideoInput): Promise<{ id: string; video: Video }> => {
      const id = await saveVideo(input)
      const video: Video = {
        ...input,
        id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      return { id, video }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: videoQueryKeys.list() })
      queryClient.invalidateQueries({
        queryKey: videoQueryKeys.byProvider(result.video.provider),
      })
    },
  })
}

/**
 * Hook to save a local video file
 */
export function useSaveLocalVideo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      fileHandle,
      input,
    }: {
      fileHandle: FileSystemFileHandle
      input: Omit<VideoInput, 'vid' | 'provider' | 'fileHandle' | 'md5' | 'size'>
    }): Promise<{ id: string }> => {
      const id = await saveLocalVideo(fileHandle, input)
      return { id }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: videoQueryKeys.list() })
      queryClient.invalidateQueries({
        queryKey: videoQueryKeys.byProvider('user'),
      })
    },
  })
}

/**
 * Hook to update a video
 */
export function useUpdateVideo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string
      updates: Partial<Omit<Video, 'id' | 'createdAt'>>
    }): Promise<void> => {
      await updateVideo(id, updates)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: videoQueryKeys.detail(variables.id),
      })
      queryClient.invalidateQueries({ queryKey: videoQueryKeys.list() })
    },
  })
}

/**
 * Hook to delete a video
 */
export function useDeleteVideo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await deleteVideo(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: videoQueryKeys.list() })
    },
  })
}

