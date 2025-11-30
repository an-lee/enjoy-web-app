import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { db, type Translation, type TranslationStyle } from '@/db'

const ITEMS_PER_PAGE = 10

// Query keys for React Query
export const translationKeys = {
  all: ['translations'] as const,
  lists: () => [...translationKeys.all, 'list'] as const,
  list: (page: number) => [...translationKeys.lists(), page] as const,
  detail: (id: string) => [...translationKeys.all, 'detail', id] as const,
  byParams: (params: {
    sourceText: string
    targetLanguage: string
    style: TranslationStyle
    customPrompt?: string
  }) => [...translationKeys.all, 'byParams', params] as const,
}

/**
 * Fetch translation history with pagination
 */
async function fetchTranslationHistory(page: number): Promise<{
  translations: Translation[]
  total: number
  totalPages: number
}> {
  const allTranslations = await db.translations
    .orderBy('createdAt')
    .reverse()
    .toArray()

  const total = allTranslations.length
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE)

  const start = (page - 1) * ITEMS_PER_PAGE
  const end = start + ITEMS_PER_PAGE
  const translations = allTranslations.slice(start, end)

  return { translations, total, totalPages }
}

/**
 * Find existing translation by parameters
 * This is a utility function that can be called directly (not a hook)
 */
export async function findExistingTranslation(params: {
  sourceText: string
  targetLanguage: string
  style: TranslationStyle
  customPrompt?: string
}): Promise<Translation | undefined> {
  const { sourceText, targetLanguage, style, customPrompt } = params

  if (style === 'custom') {
    // For custom style, we need to filter by customPrompt as well
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

/**
 * Save a new translation to the database
 */
async function saveTranslation(translation: Translation): Promise<Translation> {
  await db.translations.add(translation)
  return translation
}

/**
 * Update an existing translation
 */
async function updateTranslation(
  id: string,
  updates: Partial<Translation>
): Promise<Translation> {
  await db.translations.update(id, {
    ...updates,
    updatedAt: Date.now(),
  })
  const updated = await db.translations.get(id)
  if (!updated) {
    throw new Error('Translation not found after update')
  }
  return updated
}

/**
 * Hook to fetch translation history with pagination
 */
export function useTranslationHistory(page: number, enabled: boolean = true) {
  return useQuery({
    queryKey: translationKeys.list(page),
    queryFn: () => fetchTranslationHistory(page),
    enabled,
    staleTime: 1000 * 60, // 1 minute - history doesn't change frequently
  })
}

/**
 * Hook to find existing translation
 */
export function useFindExistingTranslation(
  params: {
    sourceText: string
    targetLanguage: string
    style: TranslationStyle
    customPrompt?: string
  } | null,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: translationKeys.byParams(params!),
    queryFn: () => findExistingTranslation(params!),
    enabled: enabled && params !== null && params.sourceText.trim() !== '',
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook to save a new translation
 */
export function useSaveTranslation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: saveTranslation,
    onSuccess: (newTranslation) => {
      // Invalidate all list queries to refresh history
      queryClient.invalidateQueries({ queryKey: translationKeys.lists() })
      // Set the new translation in cache
      queryClient.setQueryData(
        translationKeys.detail(newTranslation.id),
        newTranslation
      )
    },
  })
}

/**
 * Hook to update an existing translation
 */
export function useUpdateTranslation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Translation> }) =>
      updateTranslation(id, updates),
    onSuccess: (updatedTranslation) => {
      // Invalidate all list queries to refresh history
      queryClient.invalidateQueries({ queryKey: translationKeys.lists() })
      // Update the detail cache
      queryClient.setQueryData(
        translationKeys.detail(updatedTranslation.id),
        updatedTranslation
      )
    },
  })
}

