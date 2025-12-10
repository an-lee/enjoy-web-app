/**
 * Video API Service
 * Handles video-related API calls
 */

import { apiClient } from "./client"
import type { Video, VideoProvider } from "@/types/db"

// ============================================================================
// Types & Exports
// ============================================================================

/**
 * Parameters for fetching videos list
 */
export interface VideosListParams {
  provider?: VideoProvider
  page?: number
  limit?: number
}

// ============================================================================
// Constants
// ============================================================================

const VIDEOS_API_PATH = '/api/videos'

// ============================================================================
// Client-side API Methods
// ============================================================================

export const videoApi = {
  /**
   * Get list of videos
   *
   * Client-side only. Response is automatically converted from snake_case to camelCase
   * by the API client interceptor.
   *
   * @param params - Query parameters for filtering and pagination
   * @param params.provider - Filter by video provider (youtube, netflix)
   * @param params.page - Page number for pagination
   * @param params.limit - Number of items per page
   * @returns Array of videos in camelCase format
   */
  videos: async (params: VideosListParams = {}) => {
    return apiClient.get<Video[]>(VIDEOS_API_PATH, {
      params,
    })
  },

  /**
   * Get a single video by ID
   *
   * Client-side only. Response is automatically converted from snake_case to camelCase
   * by the API client interceptor.
   *
   * @param id - Video ID (UUID v5)
   * @returns Video details in camelCase format
   */
  video: async (id: string) => {
    return apiClient.get<Video>(`${VIDEOS_API_PATH}/${id}`)
  },
}