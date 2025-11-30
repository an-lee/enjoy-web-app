import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { db, type Translation, type TranslationStyle } from '@/db'
import { ChevronDown, ChevronUp, RefreshCw, Loader2, ArrowLeftRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LANGUAGES } from '@/lib/constants'
import { smartTranslationService } from '@/services/ai/services'
import { getAIServiceConfig } from '@/services/ai/core/config'
import { useSettingsStore } from '@/stores/settings'

export const Route = createFileRoute('/smart-translation')({
  component: SmartTranslation,
})

const TRANSLATION_STYLES: { value: TranslationStyle; label: string }[] = [
  { value: 'literal', label: 'translation.styleLiteral' },
  { value: 'natural', label: 'translation.styleNatural' },
  { value: 'casual', label: 'translation.styleCasual' },
  { value: 'formal', label: 'translation.styleFormal' },
  { value: 'simplified', label: 'translation.styleSimplified' },
  { value: 'detailed', label: 'translation.styleDetailed' },
  { value: 'custom', label: 'translation.styleCustom' },
]

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

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <div className="space-y-6">
        {/* Input Section */}
        <div className="space-y-4">
              {/* Language selection with swap button */}
              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="source-language">{t('translation.sourceLanguage')}</Label>
                  <Select
                    value={sourceLanguage}
                    onValueChange={setSourceLanguage}
                    disabled={isTranslating}
                  >
                    <SelectTrigger id="source-language" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Swap button - positioned between the two selects */}
                <div className="flex items-end pb-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleSwapLanguages}
                    disabled={isTranslating}
                    className="h-9 w-9 shrink-0"
                    title={t('translation.swapLanguages', { defaultValue: 'Swap languages' })}
                  >
                    <ArrowLeftRight className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex-1 space-y-2">
                  <Label htmlFor="target-language">{t('translation.targetLanguage')}</Label>
                  <Select
                    value={targetLanguage}
                    onValueChange={setTargetLanguage}
                    disabled={isTranslating}
                  >
                    <SelectTrigger id="target-language" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="translation-style">{t('translation.translationStyle')}</Label>
                <Select
                  value={translationStyle}
                  onValueChange={(value) => {
                    const newStyle = value as TranslationStyle
                    setTranslationStyle(newStyle)
                    // Clear custom prompt when switching away from custom style
                    if (newStyle !== 'custom') {
                      setCustomPrompt('')
                    }
                    // Clear current translation when style changes
                    setCurrentTranslation(null)
                  }}
                  disabled={isTranslating}
                >
                  <SelectTrigger id="translation-style" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSLATION_STYLES.map((style) => (
                      <SelectItem key={style.value} value={style.value}>
                        {t(style.label)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Prompt Input - shown when custom style is selected */}
              {translationStyle === 'custom' && (
                <div className="space-y-2 p-4 bg-muted/50 rounded-md border">
                  <div className="space-y-2">
                    <Label htmlFor="custom-prompt">{t('translation.customPrompt')}</Label>
                    <Textarea
                      id="custom-prompt"
                      placeholder={t('translation.customPromptPlaceholder')}
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      className="min-h-[80px]"
                      disabled={isTranslating}
                    />
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>{t('translation.customPromptDescription')}</p>
                    <p className="text-xs italic">{t('translation.customPromptHint')}</p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="translation-input">{t('translation.sourceText')}</Label>
                <div className="relative">
                  <Textarea
                    id="translation-input"
                    placeholder={t('translation.inputPlaceholder')}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="min-h-[120px] pr-10"
                    disabled={isTranslating}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault()
                        handleTranslate()
                      }
                    }}
                  />
                  {inputText && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-2 h-6 w-6"
                      onClick={() => {
                        setInputText('')
                        setCurrentTranslation(null)
                        setError(null)
                      }}
                      disabled={isTranslating}
                      title={t('translation.clear', { defaultValue: 'Clear' })}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

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
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">
                {t('translation.translatedText')}
              </Label>
              <div className="p-4 bg-muted rounded-md min-h-[60px]">
                <p className="whitespace-pre-wrap">{currentTranslation.translatedText}</p>
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegenerate}
                disabled={isTranslating}
              >
                <RefreshCw className={cn("mr-2 h-4 w-4", isTranslating && "animate-spin")} />
                {t('translation.regenerate')}
              </Button>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* History Toggle Button */}
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowHistory(!showHistory)
              if (!showHistory) {
                setCurrentPage(1)
              }
            }}
            className="text-sm text-muted-foreground"
          >
            {showHistory ? (
              <>
                <ChevronUp className="mr-1 h-4 w-4" />
                {t('translation.hideHistory')}
              </>
            ) : (
              <>
                <ChevronDown className="mr-1 h-4 w-4" />
                {t('translation.showHistory')}
              </>
            )}
          </Button>
        </div>

        {/* History Section */}
        {showHistory && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">{t('translation.history')}</h2>
            {history.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                {t('translation.noHistory')}
              </p>
            ) : (
              <>
                <div className="space-y-2">
                      {history.map((item) => {
                        const isExpanded = expandedItems.has(item.id)
                        return (
                          <div key={item.id} className="border rounded-md">
                            <button
                              onClick={() => toggleExpand(item.id)}
                              className="w-full p-4 text-left hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">
                                    {item.sourceText}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {new Date(item.createdAt).toLocaleString()}
                                  </p>
                                </div>
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
                                )}
                              </div>
                            </button>
                            {isExpanded && (
                              <div className="px-4 pb-4 space-y-3 border-t bg-muted/30">
                                <div className="pt-3 space-y-2">
                                  <Label className="text-xs font-medium text-muted-foreground">
                                    {t('translation.sourceText')}
                                  </Label>
                                  <p className="text-sm whitespace-pre-wrap">{item.sourceText}</p>
                                </div>
                                <Separator />
                                <div className="space-y-2">
                                  <Label className="text-xs font-medium text-muted-foreground">
                                    {t('translation.translatedText')}
                                  </Label>
                                  <p className="text-sm whitespace-pre-wrap">{item.translatedText}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between pt-4 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          {t('translation.previous')}
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          {t('translation.page')} {currentPage} {t('translation.of')} {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                        >
                          {t('translation.next')}
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
        )}
      </div>
    </div>
  )
}
