/**
 * Translation Query Hooks - React Query hooks for Translation entity
 *
 * CRUD Operations:
 * - Read: useTranslation, useTranslations, useTranslationByParams
 * - Create: useCreateTranslation
 * - Update: useUpdateTranslation
 * - Delete: (not implemented - translations are immutable)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  db,
  getTranslationById,
  saveTranslation as dbSaveTranslation,
  updateTranslation as dbUpdateTranslation,
  generateTranslationId,
} from '@/page/db'
import type { Translation, TranslationStyle, TranslationInput } from '@/page/types/db'

const ITEMS_PER_PAGE = 10

// ============================================================================
// Query Keys Factory
// ============================================================================

export const translationQueryKeys = {
  all: ['translations'] as const,
  lists: () => [...translationQueryKeys.all, 'list'] as const,
  list: (page: number, searchQuery?: string) =>
    [...translationQueryKeys.lists(), page, searchQuery || ''] as const,
  detail: (id: string) => [...translationQueryKeys.all, 'detail', id] as const,
  byParams: (params: {
    sourceText: string
    targetLanguage: string
    style: TranslationStyle
    customPrompt?: string
  }) => [...translationQueryKeys.all, 'byParams', params] as const,
}

// ============================================================================
// Fetch Functions
// ============================================================================

async function fetchTranslations(
  page: number,
  searchQuery?: string
): Promise<{
  translations: Translation[]
  total: number
  totalPages: number
}> {
  let query = db.translations.orderBy('createdAt').reverse()

  if (searchQuery && searchQuery.trim()) {
    const searchTerm = searchQuery.toLowerCase().trim()
    const allTranslations = await query.toArray()
    const filtered = allTranslations.filter(
      (item) =>
        item.sourceText.toLowerCase().includes(searchTerm) ||
        item.translatedText.toLowerCase().includes(searchTerm)
    )

    const total = filtered.length
    const totalPages = Math.ceil(total / ITEMS_PER_PAGE)
    const start = (page - 1) * ITEMS_PER_PAGE
    const end = start + ITEMS_PER_PAGE
    const translations = filtered.slice(start, end)

    return { translations, total, totalPages }
  }

  const allTranslations = await query.toArray()
  const total = allTranslations.length
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE)
  const start = (page - 1) * ITEMS_PER_PAGE
  const end = start + ITEMS_PER_PAGE
  const translations = allTranslations.slice(start, end)

  return { translations, total, totalPages }
}

async function fetchTranslationByParams(params: {
  sourceText: string
  targetLanguage: string
  style: TranslationStyle
  customPrompt?: string
}): Promise<Translation | undefined> {
  const { sourceText, targetLanguage, style, customPrompt } = params

  if (style === 'custom') {
    const candidates = await db.translations
      .where('[sourceText+targetLanguage+style]')
      .equals([sourceText.trim(), targetLanguage, style])
      .toArray()
    return candidates.find((item) => item.customPrompt === customPrompt?.trim())
  } else {
    return db.translations
      .where('[sourceText+targetLanguage+style]')
      .equals([sourceText.trim(), targetLanguage, style])
      .first()
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Find existing translation by parameters (utility function for direct calls)
 * This is kept for backward compatibility
 */
export async function findExistingTranslation(params: {
  sourceText: string
  targetLanguage: string
  style: TranslationStyle
  customPrompt?: string
}): Promise<Translation | undefined> {
  return fetchTranslationByParams(params)
}

// ============================================================================
// Query Hooks (Read Operations)
// ============================================================================

/**
 * Hook to fetch a single translation by ID
 */
export function useTranslation(id: string | null, enabled: boolean = true) {
  return useQuery({
    queryKey: translationQueryKeys.detail(id || ''),
    queryFn: () => {
      if (!id) return Promise.resolve(undefined)
      return getTranslationById(id)
    },
    enabled: enabled && !!id,
    staleTime: 1000 * 60,
  })
}

/**
 * Hook to fetch translations with pagination and optional search
 */
export function useTranslations(
  page: number,
  enabled: boolean = true,
  searchQuery?: string
) {
  return useQuery({
    queryKey: translationQueryKeys.list(page, searchQuery),
    queryFn: () => fetchTranslations(page, searchQuery),
    enabled,
    staleTime: 1000 * 60,
  })
}

/**
 * Hook to find existing translation by parameters
 */
export function useTranslationByParams(
  params: {
    sourceText: string
    targetLanguage: string
    style: TranslationStyle
    customPrompt?: string
  } | null,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: translationQueryKeys.byParams(params!),
    queryFn: () => fetchTranslationByParams(params!),
    enabled: enabled && params !== null && params.sourceText.trim() !== '',
    staleTime: 1000 * 60 * 5,
  })
}

// ============================================================================
// Mutation Hooks (Create/Update Operations)
// ============================================================================

/**
 * Hook to create a new translation
 * ID generation is handled internally by the mutation
 */
export function useCreateTranslation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: TranslationInput): Promise<Translation> => {
      const id = generateTranslationId(
        input.sourceText,
        input.targetLanguage,
        input.style,
        input.customPrompt
      )

      const now = new Date().toISOString()
      const translation: Translation = {
        ...input,
        id,
        createdAt: now,
        updatedAt: now,
      }

      await dbSaveTranslation(input)
      return translation
    },
    onSuccess: (newTranslation) => {
      queryClient.invalidateQueries({ queryKey: translationQueryKeys.lists() })
      queryClient.setQueryData(
        translationQueryKeys.detail(newTranslation.id),
        newTranslation
      )
      queryClient.invalidateQueries({
        queryKey: translationQueryKeys.byParams({
          sourceText: newTranslation.sourceText,
          targetLanguage: newTranslation.targetLanguage,
          style: newTranslation.style,
          customPrompt: newTranslation.customPrompt,
        }),
      })
    },
  })
}

/**
 * Hook to update an existing translation
 */
export function useUpdateTranslation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string
      updates: Partial<Translation>
    }): Promise<Translation> => {
      await dbUpdateTranslation(id, updates)
      const updated = await db.translations.get(id)
      if (!updated) {
        throw new Error('Translation not found after update')
      }
      return updated
    },
    onSuccess: (updatedTranslation) => {
      queryClient.invalidateQueries({ queryKey: translationQueryKeys.lists() })
      queryClient.setQueryData(
        translationQueryKeys.detail(updatedTranslation.id),
        updatedTranslation
      )
    },
  })
}
