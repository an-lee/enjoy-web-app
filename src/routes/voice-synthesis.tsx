import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Icon } from '@iconify/react'
import { ttsService } from '@/ai/services'
import { getAIServiceConfig } from '@/ai/core/config'
import { useSettingsStore } from '@/stores/settings'
import {
  TextInput,
  LanguageSelector,
  VoiceSelector,
  AudioResult,
  ErrorAlert,
  TTSHistoryToggle,
  TTSHistory,
} from '@/components/voice-synthesis'
import { useAudioHistory } from '@/hooks/use-audios'
import { getDefaultTTSVoice, getTTSVoices } from '@/ai/constants/tts-voices'
import { AIProvider } from '@/ai/types'
import { saveAudio, getAudioByTranslationKey, type TTSAudioInput } from '@/db'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/voice-synthesis')({
  component: VoiceSynthesis,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      translationKey: (search.translationKey as string) || undefined,
    }
  },
})

function VoiceSynthesis() {
  const { translationKey } = Route.useSearch()
  const { t } = useTranslation()
  const { learningLanguage, aiServices } = useSettingsStore()

  // Initialize with user's learning language
  const [targetLanguage, setTargetLanguage] = useState(learningLanguage)

  // Initialize voice based on current provider
  const ttsConfig = aiServices.tts
  const provider = ttsConfig?.defaultProvider || AIProvider.ENJOY
  const aiServiceConfig = getAIServiceConfig('tts')
  const byokProvider = aiServiceConfig.byok?.provider
  const [selectedVoice, setSelectedVoice] = useState(() =>
    getDefaultTTSVoice(provider, byokProvider)
  )

  const [inputText, setInputText] = useState('')
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isSynthesizing, setIsSynthesizing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  // AbortController for cancelling requests
  const abortControllerRef = useRef<AbortController | null>(null)

  const {
    data: audioHistory = [],
    isLoading: isLoadingHistory,
    refetch: refetchHistory,
  } = useAudioHistory(showHistory, searchQuery)

  // Update language when settings change
  useEffect(() => {
    setTargetLanguage(learningLanguage)
  }, [learningLanguage])

  // Update voice when provider or language changes
  useEffect(() => {
    const newProvider = aiServices.tts?.defaultProvider || AIProvider.ENJOY
    const newConfig = getAIServiceConfig('tts')
    const newByokProvider = newConfig.byok?.provider
    const availableVoices = getTTSVoices(newProvider, newByokProvider, targetLanguage)

    // Only update if current voice is not available for the new language/provider
    const isCurrentVoiceAvailable = availableVoices.some((v: { value: string }) => v.value === selectedVoice)

    if (!isCurrentVoiceAvailable) {
      const defaultVoice = getDefaultTTSVoice(newProvider, newByokProvider, targetLanguage)
      setSelectedVoice(defaultVoice)
    }
  }, [aiServices.tts, targetLanguage])

  // Clean up audio URL when component unmounts or audio changes
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [audioUrl])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // Handle input clear
  const handleClearInput = () => {
    setInputText('')
    setAudioBlob(null)
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
      setAudioUrl(null)
    }
    setError(null)
  }

  // Handle cancel request
  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsSynthesizing(false)
    setError(null)
  }

  const handleSynthesize = async () => {
    if (!inputText.trim()) return

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new AbortController
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    setIsSynthesizing(true)
    setError(null)

    // Clean up previous audio URL
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
      setAudioUrl(null)
    }
    setAudioBlob(null)

    try {
      const text = inputText.trim()

      // Check if audio already exists (only if generated from translation)
      if (translationKey) {
        const existingAudio = await getAudioByTranslationKey(translationKey)
        if (existingAudio && existingAudio.blob) {
          // Use existing audio
          setAudioBlob(existingAudio.blob)
          const url = URL.createObjectURL(existingAudio.blob)
          setAudioUrl(url)
          setIsSynthesizing(false)
          return
        }
      }

      // Generate new audio
      const config = getAIServiceConfig('tts')
      const result = await ttsService.synthesize({
        text,
        language: targetLanguage,
        voice: selectedVoice,
        config,
        signal: abortController.signal,
      })

      if (!result.success || !result.data) {
        throw new Error(result.error?.message || t('tts.error'))
      }

      const blob = result.data.audioBlob
      if (!blob) {
        throw new Error(t('tts.noAudioGenerated'))
      }

      setAudioBlob(blob)
      const url = URL.createObjectURL(blob)
      setAudioUrl(url)

      // Get audio duration
      const audio = new Audio(url)
      await new Promise((resolve, reject) => {
        audio.addEventListener('loadedmetadata', () => resolve(null))
        audio.addEventListener('error', reject)
      })
      const duration = audio.duration || 0
      audio.remove()

      // Save to database with new schema
      const ttsInput: TTSAudioInput = {
        provider: 'tts',
        title: text.substring(0, 100),
        duration,
        language: targetLanguage,
        sourceText: text,
        voice: selectedVoice,
        blob,
        syncStatus: 'local',
        ...(translationKey ? { translationKey } : {}),
      }

      await saveAudio(ttsInput)
      if (showHistory) {
        void refetchHistory()
      }

      // Clear abort controller and reset loading state on success
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null
        setIsSynthesizing(false)
      }
    } catch (err: any) {
      // Don't show error if request was cancelled
      if (err.name === 'AbortError' || err.message === 'Request was cancelled') {
        // Reset loading state on cancel
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null
          setIsSynthesizing(false)
        }
        return
      }
      setError(t('tts.error'))
      console.error('TTS synthesis failed:', err)
      // Reset loading state on error
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null
        setIsSynthesizing(false)
      }
    }
  }

  const handleRegenerate = async () => {
    if (!inputText.trim()) return

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new AbortController
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    setIsSynthesizing(true)
    setError(null)

    // Clean up previous audio URL
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
      setAudioUrl(null)
    }
    setAudioBlob(null)

    try {
      const text = inputText.trim()
      const config = getAIServiceConfig('tts')
      const result = await ttsService.synthesize({
        text,
        language: targetLanguage,
        voice: selectedVoice,
        config,
        signal: abortController.signal,
      })

      if (!result.success || !result.data) {
        throw new Error(result.error?.message || t('tts.error'))
      }

      const blob = result.data.audioBlob
      if (!blob) {
        throw new Error(t('tts.noAudioGenerated'))
      }

      setAudioBlob(blob)
      const url = URL.createObjectURL(blob)
      setAudioUrl(url)

      // Get audio duration
      const audio = new Audio(url)
      await new Promise((resolve, reject) => {
        audio.addEventListener('loadedmetadata', () => resolve(null))
        audio.addEventListener('error', reject)
      })
      const duration = audio.duration || 0
      audio.remove()

      // Save to database with new schema
      const ttsInput: TTSAudioInput = {
        provider: 'tts',
        title: text.substring(0, 100),
        duration,
        language: targetLanguage,
        sourceText: text,
        voice: selectedVoice,
        blob,
        syncStatus: 'local',
        ...(translationKey ? { translationKey } : {}),
      }

      await saveAudio(ttsInput)
      if (showHistory) {
        void refetchHistory()
      }

      // Clear abort controller and reset loading state on success
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null
        setIsSynthesizing(false)
      }
    } catch (err: any) {
      // Don't show error if request was cancelled
      if (err.name === 'AbortError' || err.message === 'Request was cancelled') {
        // Reset loading state on cancel
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null
          setIsSynthesizing(false)
        }
        return
      }
      setError(t('tts.error'))
      console.error('TTS regeneration failed:', err)
      // Reset loading state on error
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null
        setIsSynthesizing(false)
      }
    }
  }

  const handleHistoryToggle = () => {
    setShowHistory((prev) => !prev)
  }

  const handleSearchChange = (query: string) => {
    setSearchQuery(query)
  }

  const handleToggleHistoryItem = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
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
            language={targetLanguage}
            onLanguageChange={setTargetLanguage}
            disabled={isSynthesizing}
          />

          <VoiceSelector
            voice={selectedVoice}
            onVoiceChange={setSelectedVoice}
            language={targetLanguage}
            disabled={isSynthesizing}
          />

          <TextInput
            value={inputText}
            onChange={setInputText}
            onClear={handleClearInput}
            disabled={isSynthesizing}
          />

          <div className="flex justify-end gap-2">
            {isSynthesizing && (
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
              onClick={handleSynthesize}
              disabled={!inputText.trim() || isSynthesizing}
            >
              {isSynthesizing ? (
                <>
                  <Icon icon="lucide:loader-2" className="mr-2 h-4 w-4 animate-spin" />
                  {t('tts.synthesizing')}
                </>
              ) : (
                t('tts.synthesize')
              )}
            </Button>
          </div>
        </div>

        {/* Audio Result */}
        {audioUrl && (
          <div className="transition-all duration-500 ease-in-out">
            <AudioResult
              audioBlob={audioBlob}
              audioUrl={audioUrl}
              onRegenerate={handleRegenerate}
              isRegenerating={isSynthesizing}
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
          <TTSHistoryToggle isExpanded={showHistory} onToggle={handleHistoryToggle} />
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
            <TTSHistory
              history={audioHistory}
              expandedItems={expandedItems}
              isLoading={isLoadingHistory}
              searchQuery={searchQuery}
              onToggleItem={handleToggleHistoryItem}
              onSearchChange={handleSearchChange}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
