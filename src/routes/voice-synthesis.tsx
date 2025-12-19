import { createFileRoute, Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useState, useEffect, useRef } from 'react'
import { Button } from '@/page/components/ui/button'
import { Icon } from '@iconify/react'
import { ttsService } from '@/ai/services'
import { getAIServiceConfig } from '@/ai/core/config'
import { useSettingsStore } from '@/page/stores/settings'
import { createLogger } from '@/lib/utils'

// ============================================================================
// Logger
// ============================================================================

const log = createLogger({ name: 'voice-synthesis' })
import {
  TextInput,
  LanguageSelector,
  VoiceSelector,
  AudioResult,
  ErrorAlert,
  TTSHistoryToggle,
  TTSHistory,
} from '@/page/components/voice-synthesis'
import {
  useAudioHistory,
  useCreateTTSAudio,
  useAudio,
  useCreateTranscript,
} from '@/page/hooks/queries'
import { getDefaultTTSVoice, getTTSVoices } from '@/ai/constants/tts-voices'
import { AIProvider } from '@/ai/types'
import type { TTSAudioInput, TranscriptInput } from '@/page/types/db'
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

  // Get current provider name for display
  const currentProvider = provider
  const providerName = t(`settings.ai.providers.${currentProvider}`, {
    defaultValue: currentProvider === AIProvider.ENJOY ? 'Enjoy API' :
                  currentProvider === AIProvider.LOCAL ? 'Local (Free)' :
                  'BYOK (Coming Soon)'
  })
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

  // React Query hooks
  const {
    data: audioHistory = [],
    isLoading: isLoadingHistory,
    refetch: refetchHistory,
  } = useAudioHistory(showHistory, searchQuery)

  const createAudioMutation = useCreateTTSAudio()
  const createTranscriptMutation = useCreateTranscript()

  // Use audio hook to check for existing audio by translationKey
  const { audio: existingAudio } = useAudio({
    loader: translationKey ? { type: 'translationKey', translationKey } : null,
    enabled: !!translationKey,
  })

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
      if (translationKey && existingAudio && existingAudio.blob) {
        // Use existing audio
        setAudioBlob(existingAudio.blob)
        const url = URL.createObjectURL(existingAudio.blob)
        setAudioUrl(url)
        setIsSynthesizing(false)
        return
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

      // Save to database using React Query mutation
      const ttsInput: TTSAudioInput = {
        provider: 'user',
        title: text.substring(0, 100),
        duration,
        language: targetLanguage,
        sourceText: text,
        voice: selectedVoice,
        blob,
        syncStatus: 'local',
        ...(translationKey ? { translationKey } : {}),
      }

      const { id: audioId } = await createAudioMutation.mutateAsync(ttsInput)

      // Save transcript if available (from TTS timestamped model)
      if (result.data.transcript?.timeline && result.data.transcript.timeline.length > 0) {
        const transcriptInput: TranscriptInput = {
          targetType: 'Audio',
          targetId: audioId,
          language: targetLanguage,
          source: 'ai',
          timeline: result.data.transcript.timeline,
          syncStatus: 'local',
        }
        await createTranscriptMutation.mutateAsync(transcriptInput)
      }

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
      log.error('TTS synthesis failed:', err)
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

      // Save to database using React Query mutation
      const ttsInput: TTSAudioInput = {
        provider: 'user',
        title: text.substring(0, 100),
        duration,
        language: targetLanguage,
        sourceText: text,
        voice: selectedVoice,
        blob,
        syncStatus: 'local',
        ...(translationKey ? { translationKey } : {}),
      }

      const { id: audioId } = await createAudioMutation.mutateAsync(ttsInput)

      // Save transcript if available (from TTS timestamped model)
      if (result.data.transcript?.timeline && result.data.transcript.timeline.length > 0) {
        const transcriptInput: TranscriptInput = {
          targetType: 'Audio',
          targetId: audioId,
          language: targetLanguage,
          source: 'ai',
          timeline: result.data.transcript.timeline,
          syncStatus: 'local',
        }
        await createTranscriptMutation.mutateAsync(transcriptInput)
      }

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
      log.error('TTS regeneration failed:', err)
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
    <div className="container mx-auto max-w-4xl w-full py-8">
      <div className="w-full space-y-6">
        {/* Provider Info */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Icon icon="lucide:brain" className="h-4 w-4" />
            <span>
              {t('tts.currentProvider', { defaultValue: 'Provider' })}: {providerName}
            </span>
          </div>
          <Link
            to="/settings"
            search={{ tab: 'ai' }}
            className="flex items-center gap-1 text-primary hover:underline transition-colors"
          >
            <span>{t('tts.changeProvider', { defaultValue: 'Change' })}</span>
            <Icon icon="lucide:external-link" className="h-3 w-3" />
          </Link>
        </div>

        {/* Input Section */}
        <div className="space-y-4">
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
          <div>
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
          <div>
            <ErrorAlert message={error} />
          </div>
        )}

        {/* History Toggle */}
        <div>
          <TTSHistoryToggle isExpanded={showHistory} onToggle={handleHistoryToggle} />
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
