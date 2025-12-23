/**
 * TranscriptEmptyState Component
 *
 * Empty state display with upload and transcribe actions.
 */

import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
import { cn } from '@/shared/lib/utils'

interface TranscriptEmptyStateProps {
  className?: string
  isSyncing: boolean
  isTranscribing: boolean
  isUploading: boolean
  onUploadClick: () => void
  onTranscribeClick: () => void
  transcribeProgress?: string | null
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void
}

export function TranscriptEmptyState({
  className,
  isSyncing,
  isTranscribing,
  isUploading,
  onUploadClick,
  onTranscribeClick,
  transcribeProgress,
  fileInputRef,
  onFileSelect,
}: TranscriptEmptyStateProps) {
  const { t } = useTranslation()

  // Show loading state while syncing
  if (isSyncing) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center h-full text-center px-4',
          className
        )}
      >
        <Icon
          icon="lucide:loader-2"
          className="w-8 h-8 animate-spin text-primary mb-3"
        />
        <p className="text-sm text-muted-foreground">
          {t('player.transcript.syncing', { defaultValue: 'Syncing transcripts from server...' })}
        </p>
      </div>
    )
  }

  // Show empty state with action buttons after sync completes
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center h-full text-center px-4',
        className
      )}
    >
      <Icon
        icon="lucide:subtitles"
        className="w-12 h-12 text-muted-foreground/40 mb-3"
      />

      <p className="text-sm text-muted-foreground mb-1">
        {t('player.transcript.noTranscript')}
      </p>
      <p className="text-xs text-muted-foreground/60 mb-4">
        {t('player.transcript.noTranscriptHint')}
      </p>

      {/* Action buttons */}
      <div className="flex flex-col gap-2 w-full max-w-xs">
        {/* Upload Subtitle Button */}
        <div className="relative">
          <input
            ref={fileInputRef}
            type="file"
            accept=".srt,.vtt"
            onChange={onFileSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={onUploadClick}
            disabled={isUploading || isTranscribing}
            className={cn(
              'w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors',
              'bg-secondary text-secondary-foreground hover:bg-secondary/80',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            )}
          >
            {isUploading ? (
              <>
                <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin" />
                <span>{t('common.loading')}</span>
              </>
            ) : (
              <>
                <Icon icon="lucide:upload" className="w-4 h-4" />
                <span>{t('player.transcript.uploadSubtitle', { defaultValue: 'Upload Subtitle' })}</span>
              </>
            )}
          </button>
        </div>

        {/* Transcribe Button */}
        <button
          type="button"
          onClick={onTranscribeClick}
          disabled={isTranscribing || isUploading}
          className={cn(
            'w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors',
            'bg-primary text-primary-foreground hover:bg-primary/90',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          )}
        >
          {isTranscribing ? (
            <>
              <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin" />
              <span>{transcribeProgress || t('player.transcript.transcribing')}</span>
            </>
          ) : (
            <>
              <Icon icon="lucide:mic" className="w-4 h-4" />
              <span>{t('player.transcript.generateTranscript', { defaultValue: 'Generate Transcript' })}</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}

