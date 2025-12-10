/**
 * Transcript Query Hooks - React Query hooks for Transcript entity
 *
 * Provides hooks for:
 * - Single transcript fetch (by ID)
 * - Transcripts by target (Video/Audio)
 * - Transcript mutations (save, update, delete)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getTranscriptById,
  getTranscriptsByTarget,
  saveTranscript,
  updateTranscript,
  deleteTranscript,
} from '@/db'
import type { Transcript, TranscriptInput, TargetType } from '@/types/db'

// ============================================================================
// Query Keys Factory
// ============================================================================

export const transcriptQueryKeys = {
  all: ['transcripts'] as const,
  detail: (id: string) => [...transcriptQueryKeys.all, 'detail', id] as const,
  byTarget: (targetType: TargetType, targetId: string) =>
    [...transcriptQueryKeys.all, 'byTarget', targetType, targetId] as const,
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Hook to fetch a transcript by ID
 */
export function useTranscript(id: string | null, enabled: boolean = true) {
  return useQuery({
    queryKey: transcriptQueryKeys.detail(id || ''),
    queryFn: () => {
      if (!id) return Promise.resolve(undefined)
      return getTranscriptById(id)
    },
    enabled: enabled && !!id,
    staleTime: 1000 * 60,
  })
}

/**
 * Hook to fetch transcripts by target (e.g., Video or Audio)
 */
export function useTranscriptsByTarget(
  targetType: TargetType | null,
  targetId: string | null,
  enabled: boolean = true
) {
  return useQuery({
    queryKey:
      targetType && targetId
        ? transcriptQueryKeys.byTarget(targetType, targetId)
        : ['transcripts', 'empty'],
    queryFn: () => {
      if (!targetType || !targetId) return Promise.resolve([])
      return getTranscriptsByTarget(targetType, targetId)
    },
    enabled: enabled && !!targetType && !!targetId,
    staleTime: 1000 * 60,
  })
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Hook to save a new transcript to the database
 */
export function useSaveTranscript() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: TranscriptInput): Promise<string> => {
      return saveTranscript(input)
    },
    onSuccess: (id, input) => {
      queryClient.invalidateQueries({
        queryKey: transcriptQueryKeys.byTarget(input.targetType, input.targetId),
      })
      queryClient.invalidateQueries({
        queryKey: transcriptQueryKeys.detail(id),
      })
    },
  })
}

/**
 * Hook to update an existing transcript
 */
export function useUpdateTranscript() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string
      updates: Partial<Omit<Transcript, 'id' | 'createdAt'>>
    }): Promise<void> => {
      await updateTranscript(id, updates)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: transcriptQueryKeys.detail(variables.id),
      })
      queryClient.invalidateQueries({
        queryKey: transcriptQueryKeys.all,
      })
    },
  })
}

/**
 * Hook to delete a transcript
 */
export function useDeleteTranscript() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
    }: {
      id: string
      targetType?: TargetType
      targetId?: string
    }): Promise<void> => {
      await deleteTranscript(id)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: transcriptQueryKeys.detail(variables.id),
      })
      if (variables.targetType && variables.targetId) {
        queryClient.invalidateQueries({
          queryKey: transcriptQueryKeys.byTarget(
            variables.targetType,
            variables.targetId
          ),
        })
      } else {
        queryClient.invalidateQueries({
          queryKey: transcriptQueryKeys.all,
        })
      }
    },
  })
}

