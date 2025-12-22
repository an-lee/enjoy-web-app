/**
 * Library Query Hooks - React Query hooks for combined Audio/Video library
 *
 * Provides unified access to user-created media (provider === 'user')
 * with pagination and search support.
 */

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { getCurrentDatabase } from '@/page/db'
import type { Audio, Video, AudioProvider, VideoProvider } from '@/page/types/db'

// ============================================================================
// Types
// ============================================================================

export type MediaType = 'audio' | 'video'

export interface LibraryMedia {
  id: string
  type: MediaType
  title: string
  description?: string
  thumbnailUrl?: string
  duration: number
  language: string
  createdAt: string
  updatedAt: string
  // Original entity reference
  audio?: Audio
  video?: Video
}

export interface LibraryQueryResult {
  items: LibraryMedia[]
  totalCount: number
  totalPages: number
  currentPage: number
}

export interface UseLibraryOptions {
  page?: number
  pageSize?: number
  search?: string
  mediaType?: MediaType | 'all'
  enabled?: boolean
}

// User providers that should be shown in the library
const USER_AUDIO_PROVIDERS: AudioProvider[] = ['user']
const USER_VIDEO_PROVIDERS: VideoProvider[] = ['user']

// ============================================================================
// Query Keys Factory
// ============================================================================

export const libraryQueryKeys = {
  all: ['library'] as const,
  list: (page: number, pageSize: number, search: string, mediaType: string) =>
    [...libraryQueryKeys.all, 'list', page, pageSize, search, mediaType] as const,
  stats: () => [...libraryQueryKeys.all, 'stats'] as const,
}

// ============================================================================
// Helper Functions
// ============================================================================

function audioToLibraryMedia(audio: Audio): LibraryMedia {
  return {
    id: audio.id,
    type: 'audio',
    title: audio.title,
    description: audio.description,
    thumbnailUrl: audio.thumbnailUrl,
    duration: audio.duration,
    language: audio.language,
    createdAt: audio.createdAt,
    updatedAt: audio.updatedAt,
    audio,
  }
}

function videoToLibraryMedia(video: Video): LibraryMedia {
  return {
    id: video.id,
    type: 'video',
    title: video.title,
    description: video.description,
    thumbnailUrl: video.thumbnailUrl,
    duration: video.duration,
    language: video.language,
    createdAt: video.createdAt,
    updatedAt: video.updatedAt,
    video,
  }
}

function matchesSearch(item: LibraryMedia, search: string): boolean {
  const searchLower = search.toLowerCase()
  return (
    item.title.toLowerCase().includes(searchLower) ||
    (item.description?.toLowerCase().includes(searchLower) ?? false)
  )
}

// ============================================================================
// Fetch Functions
// ============================================================================

async function fetchLibraryItems(
  page: number,
  pageSize: number,
  search: string,
  mediaType: MediaType | 'all'
): Promise<LibraryQueryResult> {
  // Fetch user audios and videos in parallel
  const [audios, videos] = await Promise.all([
    mediaType === 'video'
      ? Promise.resolve([])
      : getCurrentDatabase().audios
          .where('provider')
          .anyOf(USER_AUDIO_PROVIDERS)
          .toArray(),
    mediaType === 'audio'
      ? Promise.resolve([])
      : getCurrentDatabase().videos
          .where('provider')
          .anyOf(USER_VIDEO_PROVIDERS)
          .toArray(),
  ])

  // Convert to unified format
  let allItems: LibraryMedia[] = [
    ...audios.map(audioToLibraryMedia),
    ...videos.map(videoToLibraryMedia),
  ]

  // Apply search filter
  if (search.trim()) {
    allItems = allItems.filter((item) => matchesSearch(item, search))
  }

  // Sort by createdAt descending (newest first)
  allItems.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  const totalCount = allItems.length
  const totalPages = Math.ceil(totalCount / pageSize)
  const startIndex = (page - 1) * pageSize
  const items = allItems.slice(startIndex, startIndex + pageSize)

  return {
    items,
    totalCount,
    totalPages,
    currentPage: page,
  }
}

async function fetchLibraryStats(): Promise<{
  audioCount: number
  videoCount: number
  totalCount: number
}> {
  const [audioCount, videoCount] = await Promise.all([
    getCurrentDatabase().audios.where('provider').anyOf(USER_AUDIO_PROVIDERS).count(),
    getCurrentDatabase().videos.where('provider').anyOf(USER_VIDEO_PROVIDERS).count(),
  ])

  return {
    audioCount,
    videoCount,
    totalCount: audioCount + videoCount,
  }
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Hook for fetching library items with pagination and search
 */
export function useLibrary(options: UseLibraryOptions = {}) {
  const {
    page = 1,
    pageSize = 12,
    search = '',
    mediaType = 'all',
    enabled = true,
  } = options

  return useQuery({
    queryKey: libraryQueryKeys.list(page, pageSize, search, mediaType),
    queryFn: () => fetchLibraryItems(page, pageSize, search, mediaType),
    enabled,
    staleTime: 1000 * 30,
  })
}

/**
 * Hook for fetching library statistics
 */
export function useLibraryStats(enabled: boolean = true) {
  return useQuery({
    queryKey: libraryQueryKeys.stats(),
    queryFn: fetchLibraryStats,
    enabled,
    staleTime: 1000 * 60, // Cache for 1 minute
  })
}

/**
 * Hook to delete a media item
 */
export function useDeleteLibraryItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      type,
    }: {
      id: string
      type: MediaType
    }): Promise<void> => {
      if (type === 'audio') {
        await getCurrentDatabase().audios.delete(id)
      } else {
        await getCurrentDatabase().videos.delete(id)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: libraryQueryKeys.all })
    },
  })
}

