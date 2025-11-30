import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { db, type Translation, type TranslationStyle } from '@/db'
import { smartTranslationService } from '@/services/ai/services'
import { getAIServiceConfig } from '@/services/ai/core/config'
import { useSettingsStore } from '@/stores/settings'
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

export const Route = createFileRoute('/smart-translation')({
  component: SmartTranslation,
})

const ITEMS_PER_PAGE = 10

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
  const [history, setHistory] = useState<Translation[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [totalPages, setTotalPages] = useState(0)

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

  // Load translation history
  useEffect(() => {
    if (showHistory) {
      loadHistory(currentPage)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showHistory, currentPage])


  const loadHistory = async (page?: number) => {
    try {
      const pageToLoad = page ?? currentPage
      const allTranslations = await db.translations
        .orderBy('createdAt')
        .reverse()
        .toArray()

      const total = allTranslations.length
      setTotalPages(Math.ceil(total / ITEMS_PER_PAGE))

      const start = (pageToLoad - 1) * ITEMS_PER_PAGE
      const end = start + ITEMS_PER_PAGE
      setHistory(allTranslations.slice(start, end))
    } catch (err) {
      console.error('Failed to load translation history:', err)
    }
  }

  const handleTranslate = async () => {
    if (!inputText.trim()) return
    if (translationStyle === 'custom' && !customPrompt.trim()) {
      setError(t('translation.customPromptRequired'))
      return
    }

    setIsTranslating(true)
    setError(null)

    try {
      // For custom style, check if translation with same prompt exists
      let existing: Translation | undefined
      if (translationStyle === 'custom') {
        // For custom style, we need to filter by customPrompt as well
        const candidates = await db.translations
          .where('[sourceText+targetLanguage+style]')
          .equals([inputText.trim(), targetLanguage, translationStyle])
          .toArray()
        existing = candidates.find((item) => item.customPrompt === customPrompt.trim())
      } else {
        existing = await db.translations
          .where('[sourceText+targetLanguage+style]')
          .equals([inputText.trim(), targetLanguage, translationStyle])
          .first()
      }

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
      })

      if (!result.success || !result.data) {
        throw new Error(result.error?.message || t('translation.error'))
      }

      const newTranslation: Translation = {
        id: `trans_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sourceText: inputText.trim(),
        sourceLanguage,
        targetLanguage,
        translatedText: result.data.translatedText,
        style: translationStyle,
        customPrompt: translationStyle === 'custom' ? customPrompt.trim() : undefined,
        aiModel: result.data.aiModel,
        syncStatus: 'local',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      // Save to database
      await db.translations.add(newTranslation)
      setCurrentTranslation(newTranslation)

      // Always refresh history if it's shown (for real-time updates)
      if (showHistory) {
        // Load history for page 1 directly to ensure immediate update
        await loadHistory(1)
        // Navigate to page 1 to show the latest translation
        // This will trigger useEffect, but we've already loaded, so it's safe
        setCurrentPage(1)
        // Expand the new translation item
        setExpandedItems((prev) => new Set([...prev, newTranslation.id]))
      }
    } catch (err) {
      setError(t('translation.error'))
      console.error('Translation failed:', err)
    } finally {
      setIsTranslating(false)
    }
  }

  const handleRegenerate = async () => {
    if (!inputText.trim() || !currentTranslation) return
    if (translationStyle === 'custom' && !customPrompt.trim()) {
      setError(t('translation.customPromptRequired'))
      return
    }

    setIsTranslating(true)
    setError(null)

    try {
      // Call actual translation API with regenerate flag
      const config = getAIServiceConfig('smartTranslation')
      const result = await smartTranslationService.translate({
        sourceText: inputText.trim(),
        sourceLanguage,
        targetLanguage,
        style: translationStyle,
        customPrompt: translationStyle === 'custom' ? customPrompt.trim() : undefined,
        config,
      })

      if (!result.success || !result.data) {
        throw new Error(result.error?.message || t('translation.error'))
      }

      const updatedTranslation: Translation = {
        ...currentTranslation,
        translatedText: result.data.translatedText,
        customPrompt: translationStyle === 'custom' ? customPrompt.trim() : currentTranslation.customPrompt,
        aiModel: result.data.aiModel,
        updatedAt: Date.now(),
      }

      // Update in database
      await db.translations.update(currentTranslation.id, updatedTranslation)
      setCurrentTranslation(updatedTranslation)

      // Refresh history if it's shown (for real-time updates)
      if (showHistory) {
        await loadHistory()
      }
    } catch (err) {
      setError(t('translation.error'))
      console.error('Regeneration failed:', err)
    } finally {
      setIsTranslating(false)
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
    }
  }

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <div className="space-y-6">
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

          <div className="flex justify-end">
            <Button
              onClick={handleTranslate}
              disabled={!inputText.trim() || isTranslating}
            >
              {isTranslating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
          <TranslationResult
            translation={currentTranslation}
            onRegenerate={handleRegenerate}
            isRegenerating={isTranslating}
          />
        )}

        {/* Error Message */}
        {error && <ErrorAlert message={error} />}

        {/* History Toggle Button */}
        <HistoryToggle isExpanded={showHistory} onToggle={handleHistoryToggle} />

        {/* History Section */}
        {showHistory && (
          <TranslationHistory
            history={history}
            expandedItems={expandedItems}
            currentPage={currentPage}
            totalPages={totalPages}
            onToggleItem={toggleExpand}
            onPageChange={setCurrentPage}
          />
        )}
      </div>
    </div>
  )
}
