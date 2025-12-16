/**
 * Video API Service
 * Handles video-related API calls
 */

import { apiClient } from "./client"
import type { Audio, AudioProvider } from "@/types/db"

// ============================================================================
// Types & Exports
// ============================================================================

/**
 * Parameters for fetching videos list
 */
export interface AudiosListParams {
  provider?: AudioProvider
  page?: number
  limit?: number
}

// ============================================================================
// Constants
// ============================================================================

const AUDIOS_API_PATH = '/api/v1/mine/audios'

// ============================================================================
// Client-side API Methods
// ============================================================================

export const audioApi = {
  /**
   * Get list of audios
   *
   * Client-side only. Response is automatically converted from snake_case to camelCase
   * by the API client interceptor.
   *
   * @param params - Query parameters for filtering and pagination
   * @param params.provider - Filter by audio provider (user)
   * @param params.page - Page number for pagination
   * @param params.limit - Number of items per page
   * @returns Array of audios in camelCase format
   */
  audios: async (params: AudiosListParams = {}) => {
    return apiClient.get<Audio[]>(AUDIOS_API_PATH, {
      params,
    })
  },

  /**
   * Get a single audio by ID
   *
   * Client-side only. Response is automatically converted from snake_case to camelCase
   * by the API client interceptor.
   *
   * @param id - Audio ID (UUID v5)
   * @returns Video details in camelCase format
   */
  audio: async (id: string) => {
    return apiClient.get<Audio>(`${AUDIOS_API_PATH}/${id}`)
  },

  /**
   * Upload an audio
   *
   * Client-side only. Response is automatically converted from snake_case to camelCase
   * by the API client interceptor.
   *
   * @param audio - Audio to upload
   * @returns Audio details in camelCase format
   */
  uploadAudio: async (audio: Audio) => {
    return apiClient.post<Audio>(AUDIOS_API_PATH, {
      audio,
    })
  },
}