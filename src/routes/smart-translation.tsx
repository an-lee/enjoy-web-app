import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useState, useEffect, useRef } from 'react'
import { useDebounce } from '@uidotdev/usehooks'
import { Button } from '@/components/ui/button'
import { Icon } from '@iconify/react'
import type { Translation, TranslationStyle } from '@/types/db'
import { smartTranslationService } from '@/ai/services'
import { getAIServiceConfig } from '@/ai/core/config'
import { useSettingsStore } from '@/stores/settings'
import {
  useTranslations,
  useCreateTranslation,
  useUpdateTranslation,
  findExistingTranslation,
} from '@/hooks/queries'
import {
  LanguageSelector,
  TranslationStyleSelector,
  CustomPromptInput,
  TranslationInput,
  TranslationResult,
  ErrorAlert,
  HistoryToggle,
  TranslationHistory,
} from '@/components/smart-translation'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/smart-translation')({
  component: SmartTranslation,
})

function SmartTranslation() {
  const { t } = useTranslation()
  const { nativeLanguage, learningLanguage } = useSettingsStore()

  // Initialize with user's settings: source = native, target = learning
  const [sourceLanguage, setSourceLanguage] = useState(nativeLanguage)
  const [targetLanguage, setTargetLanguage] = useState(learningLanguage)

  const [inputText, setInputText] = useState('')
  const [translationStyle, setTranslationStyle] = useState<TranslationStyle>('natural')
  const [customPrompt, setCustomPrompt] = useState('')
  const [currentTranslation, setCurrentTranslation] = useState<Translation | null>(null)
  const [isTranslating, setIsTranslating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  // AbortController for cancelling requests
  const abortControllerRef = useRef<AbortController | null>(null)

  // Debounce search query to avoid excessive database queries
  // 300ms delay is a good balance between responsiveness and performance
  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  // React Query hooks
  const {
    data: historyData,
    isLoading: isLoadingHistory,
  } = useTranslations(currentPage, showHistory, debouncedSearchQuery)

  const createTranslationMutation = useCreateTranslation()
  const updateTranslationMutation = useUpdateTranslation()

  const history = historyData?.translations ?? []
  const totalPages = historyData?.totalPages ?? 0

  // Update languages when settings change
  useEffect(() => {
    setSourceLanguage(nativeLanguage)
    setTargetLanguage(learningLanguage)
  }, [nativeLanguage, learningLanguage])

  // Handle language swap
  const handleSwapLanguages = () => {
    setSourceLanguage(targetLanguage)
    setTargetLanguage(sourceLanguage)
    // Clear current translation when languages are swapped
    setCurrentTranslation(null)
  }

  // Handle style change
  const handleStyleChange = (newStyle: TranslationStyle) => {
    setTranslationStyle(newStyle)
    // Clear custom prompt when switching away from custom style
    if (newStyle !== 'custom') {
      setCustomPrompt('')
    }
    // Clear current translation when style changes
    setCurrentTranslation(null)
  }

  // Handle input clear
  const handleClearInput = () => {
    setInputText('')
    setCurrentTranslation(null)
    setError(null)
  }

  // Handle cancel request
  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsTranslating(false)
    setError(null)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])


  const handleTranslate = async () => {
    if (!inputText.trim()) return
    if (translationStyle === 'custom' && !customPrompt.trim()) {
      setError(t('translation.customPromptRequired'))
      return
    }

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new AbortController
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    setIsTranslating(true)
    setError(null)

    try {
      // Check if translation already exists in database
      const existing = await findExistingTranslation({
        sourceText: inputText.trim(),
        targetLanguage,
        style: translationStyle,
        customPrompt: translationStyle === 'custom' ? customPrompt.trim() : undefined,
      })

      if (existing) {
        setCurrentTranslation(existing)
        setIsTranslating(false)
        return
      }

      // Call actual translation API
      const config = getAIServiceConfig('smartTranslation')
      const result = await smartTranslationService.translate({
        sourceText: inputText.trim(),
        sourceLanguage,
        targetLanguage,
        style: translationStyle,
        customPrompt: translationStyle === 'custom' ? customPrompt.trim() : undefined,
        config,
        signal: abortController.signal,
      })

      if (!result.success || !result.data) {
        throw new Error(result.error?.message || t('translation.error'))
      }

      // Save to database using React Query mutation (ID is generated internally)
      const savedTranslation = await createTranslationMutation.mutateAsync({
        sourceText: inputText.trim(),
        sourceLanguage,
        targetLanguage,
        translatedText: result.data.translatedText,
        style: translationStyle,
        customPrompt: translationStyle === 'custom' ? customPrompt.trim() : undefined,
        aiModel: result.data.aiModel,
        syncStatus: 'local',
      })
      setCurrentTranslation(savedTranslation)

      // If history is shown, navigate to page 1 and expand the new item
      if (showHistory) {
        setCurrentPage(1)
        setExpandedItems((prev) => new Set([...prev, savedTranslation.id]))
      }

      // Clear abort controller and reset loading state on success
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null
        setIsTranslating(false)
      }
    } catch (err: any) {
      // Don't show error if request was cancelled
      if (err.name === 'AbortError' || err.message === 'Request was cancelled') {
        // Reset loading state on cancel
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null
          setIsTranslating(false)
        }
        return
      }
      setError(t('translation.error'))
      console.error('Translation failed:', err)
      // Reset loading state on error
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null
        setIsTranslating(false)
      }
    }
  }

  const handleRegenerate = async () => {
    if (!inputText.trim() || !currentTranslation) return
    if (translationStyle === 'custom' && !customPrompt.trim()) {
      setError(t('translation.customPromptRequired'))
      return
    }

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new AbortController
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    setIsTranslating(true)
    setError(null)

    try {
      // Call actual translation API
      const config = getAIServiceConfig('smartTranslation')
      const result = await smartTranslationService.translate({
        sourceText: inputText.trim(),
        sourceLanguage,
        targetLanguage,
        style: translationStyle,
        customPrompt: translationStyle === 'custom' ? customPrompt.trim() : undefined,
        config,
        signal: abortController.signal,
      })

      if (!result.success || !result.data) {
        throw new Error(result.error?.message || t('translation.error'))
      }

      // Update in database using React Query mutation
      const updatedTranslation = await updateTranslationMutation.mutateAsync({
        id: currentTranslation.id,
        updates: {
          translatedText: result.data.translatedText,
          customPrompt: translationStyle === 'custom' ? customPrompt.trim() : currentTranslation.customPrompt,
          aiModel: result.data.aiModel,
        },
      })

      setCurrentTranslation(updatedTranslation)

      // Clear abort controller and reset loading state on success
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null
        setIsTranslating(false)
      }
    } catch (err: any) {
      // Don't show error if request was cancelled
      if (err.name === 'AbortError' || err.message === 'Request was cancelled') {
        // Reset loading state on cancel
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null
          setIsTranslating(false)
        }
        return
      }
      setError(t('translation.error'))
      console.error('Regeneration failed:', err)
      // Reset loading state on error
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null
        setIsTranslating(false)
      }
    }
  }

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedItems(newExpanded)
  }

  // Handle history toggle
  const handleHistoryToggle = () => {
    setShowHistory(!showHistory)
    if (!showHistory) {
      setCurrentPage(1)
      setSearchQuery('')
    }
  }

  // Handle search change - reset to page 1 when search changes
  // Note: We update searchQuery immediately for UI responsiveness,
  // but the actual database query uses debouncedSearchQuery
  const handleSearchChange = (query: string) => {
    setSearchQuery(query)
    setCurrentPage(1)
  }

  return (
    <div
      className={cn(
        'container mx-auto max-w-4xl transition-all duration-500 ease-in-out w-full',
        showHistory
          ? 'py-8'
          : 'flex items-center h-full min-h-0'
      )}
    >
      <div
        className={cn(
          'w-full space-y-6 transition-all duration-500 ease-in-out',
          !showHistory && 'mx-auto'
        )}
      >
        {/* Input Section */}
        <div
          className={cn(
            'space-y-4 transition-all duration-500 ease-in-out',
            !showHistory && 'opacity-100'
          )}
        >
          <LanguageSelector
            sourceLanguage={sourceLanguage}
            targetLanguage={targetLanguage}
            onSourceLanguageChange={setSourceLanguage}
            onTargetLanguageChange={setTargetLanguage}
            onSwapLanguages={handleSwapLanguages}
            disabled={isTranslating}
          />

          <TranslationStyleSelector
            value={translationStyle}
            onValueChange={handleStyleChange}
            disabled={isTranslating}
          />

          {translationStyle === 'custom' && (
            <CustomPromptInput
              value={customPrompt}
              onChange={setCustomPrompt}
              disabled={isTranslating}
            />
          )}

          <TranslationInput
            value={inputText}
            onChange={setInputText}
            onClear={handleClearInput}
            onTranslate={handleTranslate}
            disabled={isTranslating}
          />

          <div className="flex justify-end gap-2">
            {isTranslating && (
              <Button
                onClick={handleCancel}
                variant="outline"
                type="button"
              >
                <Icon icon="lucide:x" className="mr-2 h-4 w-4" />
                {t('common.cancel')}
              </Button>
            )}
            <Button
              onClick={handleTranslate}
              disabled={!inputText.trim() || isTranslating}
            >
              {isTranslating ? (
                <>
                  <Icon icon="lucide:loader-2" className="mr-2 h-4 w-4 animate-spin" />
                  {t('translation.loading')}
                </>
              ) : (
                t('translation.translate')
              )}
            </Button>
          </div>
        </div>

        {/* Translation Result */}
        {currentTranslation && (
          <div className="transition-all duration-500 ease-in-out">
            <TranslationResult
              translation={currentTranslation}
              onRegenerate={handleRegenerate}
              isRegenerating={isTranslating}
            />
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="transition-all duration-500 ease-in-out">
            <ErrorAlert message={error} />
          </div>
        )}

        {/* History Toggle */}
        <div className="transition-all duration-500 ease-in-out">
          <HistoryToggle isExpanded={showHistory} onToggle={handleHistoryToggle} />
        </div>

        {/* History List */}
        <div
          className={cn(
            'transition-all duration-500 ease-in-out overflow-hidden',
            showHistory
              ? 'max-h-[2000px] opacity-100 mt-6'
              : 'max-h-0 opacity-0 mt-0'
          )}
        >
          <div
            className={cn(
              'transition-all duration-500 ease-in-out',
              showHistory
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 -translate-y-4'
            )}
          >
            <TranslationHistory
              history={history}
              expandedItems={expandedItems}
              currentPage={currentPage}
              totalPages={totalPages}
              isLoading={isLoadingHistory}
              searchQuery={searchQuery}
              onToggleItem={toggleExpand}
              onPageChange={setCurrentPage}
              onSearchChange={handleSearchChange}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
