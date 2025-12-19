import { createFileRoute, Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useState, useEffect, useRef } from 'react'
import { useDebounce } from '@uidotdev/usehooks'
import { Button } from '@/page/components/ui/button'
import { Icon } from '@iconify/react'
import type { Translation, TranslationStyle } from '@/page/types/db'
import { smartTranslationService } from '@/ai/services'
import { getAIServiceConfig } from '@/ai/core/config'
import { useSettingsStore } from '@/page/stores/settings'
import { AIProvider } from '@/ai/types'
import { createLogger } from '@/lib/utils'

// ============================================================================
// Logger
// ============================================================================

const log = createLogger({ name: 'smart-translation' })
import {
  useTranslations,
  useCreateTranslation,
  useUpdateTranslation,
  findExistingTranslation,
} from '@/page/hooks/queries'
import {
  LanguageSelector,
  TranslationStyleSelector,
  CustomPromptInput,
  TranslationInput,
  TranslationResult,
  ErrorAlert,
  HistoryToggle,
  TranslationHistory,
} from '@/page/components/smart-translation'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/smart-translation')({
  component: SmartTranslation,
})

function SmartTranslation() {
  const { t } = useTranslation()
  const { nativeLanguage, learningLanguage, aiServices } = useSettingsStore()

  // Get current provider for smart translation
  const currentProvider = aiServices.smartTranslation?.defaultProvider || AIProvider.ENJOY
  const providerName = t(`settings.ai.providers.${currentProvider}`, {
    defaultValue: currentProvider === AIProvider.ENJOY ? 'Enjoy API' :
                  currentProvider === AIProvider.LOCAL ? 'Local (Free)' :
                  'BYOK (Coming Soon)'
  })

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
      log.error('Translation failed:', err)
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
      log.error('Regeneration failed:', err)
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
    <div className="container mx-auto max-w-4xl w-full py-8">
      <div className="w-full space-y-6">
        {/* Provider Info */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Icon icon="lucide:brain" className="h-4 w-4" />
            <span>
              {t('translation.currentProvider', { defaultValue: 'Provider' })}: {providerName}
            </span>
          </div>
          <Link
            to="/settings"
            search={{ tab: 'ai' }}
            className="flex items-center gap-1 text-primary hover:underline transition-colors"
          >
            <span>{t('translation.changeProvider', { defaultValue: 'Change' })}</span>
            <Icon icon="lucide:external-link" className="h-3 w-3" />
          </Link>
        </div>

        {/* Input Section */}
        <div className="space-y-4">
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
          <div>
            <TranslationResult
              translation={currentTranslation}
              onRegenerate={handleRegenerate}
              isRegenerating={isTranslating}
            />
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div>
            <ErrorAlert message={error} />
          </div>
        )}

        {/* History Toggle */}
        <div>
          <HistoryToggle isExpanded={showHistory} onToggle={handleHistoryToggle} />
        </div>

        {/* History List */}
        <div
          className={cn(
            'overflow-hidden will-change-[max-height,opacity]',
            'transition-[max-height,opacity] duration-300 ease-in-out',
            showHistory
              ? 'max-h-[2000px] opacity-100'
              : 'max-h-0 opacity-0'
          )}
        >
          <div
            className={cn(
              'transition-transform duration-300 ease-in-out',
              showHistory
                ? 'translate-y-0'
                : '-translate-y-2'
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
