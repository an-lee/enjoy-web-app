import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getTranscriptById,
  getTranscriptsByTarget,
  saveTranscript,
  updateTranscript,
  deleteTranscript,
} from '@/db'
import type { Transcript, TranscriptInput, TargetType } from '@/types/db'

// Query keys factory
export const transcriptKeys = {
  all: ['transcripts'] as const,
  detail: (id: string) => [...transcriptKeys.all, 'detail', id] as const,
  byTarget: (targetType: TargetType, targetId: string) =>
    [...transcriptKeys.all, 'byTarget', targetType, targetId] as const,
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Hook to fetch a transcript by ID
 */
export function useTranscript(id: string | null, enabled: boolean = true) {
  return useQuery({
    queryKey: transcriptKeys.detail(id || ''),
    queryFn: () => {
      if (!id) return Promise.resolve(undefined)
      return getTranscriptById(id)
    },
    enabled: enabled && !!id,
    staleTime: 1000 * 60, // 1 minute
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
        ? transcriptKeys.byTarget(targetType, targetId)
        : ['transcripts', 'empty'],
    queryFn: () => {
      if (!targetType || !targetId) return Promise.resolve([])
      return getTranscriptsByTarget(targetType, targetId)
    },
    enabled: enabled && !!targetType && !!targetId,
    staleTime: 1000 * 60, // 1 minute
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
      // Invalidate queries for the target
      queryClient.invalidateQueries({
        queryKey: transcriptKeys.byTarget(input.targetType, input.targetId),
      })
      // Set the detail cache
      queryClient.invalidateQueries({
        queryKey: transcriptKeys.detail(id),
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
      // Invalidate detail cache
      queryClient.invalidateQueries({
        queryKey: transcriptKeys.detail(variables.id),
      })
      // Invalidate all transcript queries (we don't know the target from here)
      queryClient.invalidateQueries({
        queryKey: transcriptKeys.all,
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
      // Invalidate detail cache
      queryClient.invalidateQueries({
        queryKey: transcriptKeys.detail(variables.id),
      })
      // If we know the target, invalidate that query
      if (variables.targetType && variables.targetId) {
        queryClient.invalidateQueries({
          queryKey: transcriptKeys.byTarget(
            variables.targetType,
            variables.targetId
          ),
        })
      } else {
        // Otherwise invalidate all
        queryClient.invalidateQueries({
          queryKey: transcriptKeys.all,
        })
      }
    },
  })
}

