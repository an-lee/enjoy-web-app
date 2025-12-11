/**
 * TranscriptHeader Component
 *
 * Header section with language selectors and retranscribe button.
 */

import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
import { cn } from '@/lib/utils'
import { LanguageSelector } from './language-selector'
import { LANGUAGE_NAMES } from './constants'
import type { Transcript } from '@/types/db'

interface TranscriptHeaderProps {
  primaryLanguage: string | null
  secondaryLanguage: string | null
  availableTranscripts: Transcript[]
  onPrimaryLanguageChange: (language: string) => void
  onSecondaryLanguageChange: (value: string) => void
  onClearSecondaryLanguage: () => void
  onRetranscribe: () => void
  isTranscribing: boolean
  progress: string | null
  hasCurrentSession: boolean
}

export function TranscriptHeader({
  primaryLanguage,
  secondaryLanguage,
  availableTranscripts,
  onPrimaryLanguageChange,
  onSecondaryLanguageChange,
  onClearSecondaryLanguage,
  hasCurrentSession,
  onRetranscribe,
  isTranscribing,
  progress,
}: TranscriptHeaderProps) {
  const { t } = useTranslation()

  // Build language options
  const languageOptions = availableTranscripts.map((t) => ({
    value: t.language,
    label: LANGUAGE_NAMES[t.language] || t.language.toUpperCase(),
  }))

  // Secondary language options - filtered to exclude primary
  const secondaryLanguageOptions = languageOptions.filter(
    (o) => o.value !== primaryLanguage
  )

  return (
    <div className="shrink-0 flex items-center justify-between gap-4 px-4 py-3 border-b bg-background/80 backdrop-blur-sm">
      {/* Language selectors */}
      <div className="flex items-center justify-center gap-6 flex-1">
        <LanguageSelector
          label={t('player.transcript.primary')}
          value={primaryLanguage}
          options={languageOptions}
          onChange={onPrimaryLanguageChange}
          placeholder={t('player.transcript.selectLanguage')}
        />
        <LanguageSelector
          label={t('player.transcript.secondary')}
          value={secondaryLanguage}
          options={secondaryLanguageOptions}
          onChange={onSecondaryLanguageChange}
          placeholder={t('player.transcript.selectLanguage')}
          allowNone
          onClear={onClearSecondaryLanguage}
        />
      </div>

      {/* Retranscribe button */}
      <button
        type="button"
        onClick={onRetranscribe}
        disabled={isTranscribing || !hasCurrentSession}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
          'bg-primary text-primary-foreground hover:bg-primary/90',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
        )}
        title={t('player.transcript.retranscribe')}
      >
        {isTranscribing ? (
          <>
            <Icon icon="lucide:loader-2" className="w-3 h-3 animate-spin" />
            <span>{progress || t('player.transcript.retranscribing')}</span>
          </>
        ) : (
          <>
            <Icon icon="lucide:refresh-cw" className="w-3 h-3" />
            <span>{t('player.transcript.retranscribe')}</span>
          </>
        )}
      </button>
    </div>
  )
}

