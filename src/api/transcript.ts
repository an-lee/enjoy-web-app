/**
 * Video API Service
 * Handles video-related API calls
 */

import { Language } from "@/page/lib/constants"
import { apiClient } from "./client"
import type { TargetType, Transcript, TranscriptSource } from "@/page/types/db"

// ============================================================================
// Types & Exports
// ============================================================================

/**
 * Parameters for fetching videos list
 */
export interface TranscriptsListParams {
  targetId?: string
  targetType?: TargetType
  source?: TranscriptSource
  language?: Language
}

// ============================================================================
// Constants
// ============================================================================

const TRANSCRIPTS_API_PATH = '/api/v1/transcripts'

// ============================================================================
// Client-side API Methods
// ============================================================================

export const transcriptApi = {
  /**
   * Get list of transcripts
   *
   * Client-side only. Response is automatically converted from snake_case to camelCase
   * by the API client interceptor.
   *
   * @param params - Query parameters for filtering and pagination
   * @param params.targetId - Filter by target ID
   * @param params.targetType - Filter by target type (video, audio)
   * @param params.source - Filter by source (youtube, netflix)
   * @param params.language - Filter by language
   * @returns Array of transcripts in camelCase format
   */
  transcripts: async (params: TranscriptsListParams = {}) => {
    return apiClient.get<Transcript[]>(TRANSCRIPTS_API_PATH, {
      params,
    })
  },

  /**
   * Get a single video by ID
   *
   * Client-side only. Response is automatically converted from snake_case to camelCase
   * by the API client interceptor.
   *
   * @param id - Transcript ID (UUID v5)
   * @returns Transcript details in camelCase format
   */
  transcript: async (id: string) => {
    return apiClient.get<Transcript>(`${TRANSCRIPTS_API_PATH}/${id}`)
  },

  /**
   * Upload a transcript
   *
   * Client-side only. Response is automatically converted from snake_case to camelCase
   * by the API client interceptor.
   *
   * @param transcript - Transcript to upload (includes id for deterministic UUID v5)
   * @returns Transcript details in camelCase format
   */
  uploadTranscript: async (transcript: Transcript) => {
    return apiClient.post<Transcript>(TRANSCRIPTS_API_PATH, {
      transcript,
    })
  },
}