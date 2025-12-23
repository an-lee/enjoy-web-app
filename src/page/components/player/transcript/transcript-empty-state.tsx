/**
 * TranscriptEmptyState Component
 *
 * Empty state display with upload and transcribe actions.
 * Manages its own state internally using hooks.
 */

import { useState, RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
import { cn } from '@/shared/lib/utils'
import { usePlayerSessionStore } from '@/page/stores/player/player-session-store'
import { usePlayerTranscriptionStore } from '@/page/stores/player/player-transcription-store'
import { useTranscriptDisplay } from '@/page/hooks/player/use-transcript-display'
import { useUploadSubtitle } from '@/page/hooks/player/use-upload-subtitle'
import { TranscribeDialog } from './transcribe-dialog'

interface TranscriptEmptyStateProps {
  className?: string
  /** Optional ref to existing media element (audio or video) */
  mediaRef?: RefObject<HTMLAudioElement | HTMLVideoElement | null>
}

export function TranscriptEmptyState({
  className,
  mediaRef,
}: TranscriptEmptyStateProps) {
  const { t } = useTranslation()
  const currentSession = usePlayerSessionStore((s) => s.currentSession)
  const mediaDuration = currentSession?.duration || 0

  // Get sync state from transcript display hook
  const { syncState } = useTranscriptDisplay()
  const isSyncing = syncState.isSyncing

  // Get transcribe state from store
  const isTranscribing = usePlayerTranscriptionStore((s) => s.isTranscribing)
  const transcribeProgress = usePlayerTranscriptionStore((s) => s.transcribeProgress)

  // Get upload subtitle functionality
  const {
    triggerFileSelect,
    handleFileSelect,
    fileInputRef,
    isUploading,
  } = useUploadSubtitle()

  // Manage transcribe dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  // Handle transcribe button click
  const handleTranscribeClick = () => {
    setShowConfirmDialog(true)
  }

  // Show loading state while syncing
  if (isSyncing) {
    return (
      <>
        <TranscribeDialog
          open={showConfirmDialog}
          onOpenChange={setShowConfirmDialog}
          mediaDuration={mediaDuration}
          mediaRef={mediaRef}
        />
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
      </>
    )
  }

  // Show empty state with action buttons after sync completes
  return (
    <>
      <TranscribeDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        mediaDuration={mediaDuration}
        mediaRef={mediaRef}
      />
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
              accept=".srt,.vtt,.ssa,.ass"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={triggerFileSelect}
              disabled={isUploading || isTranscribing || !currentSession}
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
            onClick={handleTranscribeClick}
            disabled={isTranscribing || isUploading || !currentSession}
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
    </>
  )
}

