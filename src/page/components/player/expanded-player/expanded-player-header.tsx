import { useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/page/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/page/components/ui/tooltip'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/page/components/ui/drawer'
import { usePlayerStore } from '@/page/stores/player'
import {
  useTranscriptDisplay,
  useRetranscribe,
  useUploadSubtitle,
} from '@/page/hooks/player'
import { RetranscribeDialog, LANGUAGE_NAMES } from '../transcript'
import { LanguageSelector } from '../shared'

interface ExpandedPlayerHeaderProps {
  /** Optional ref to existing media element (audio or video) */
  mediaRef?: React.RefObject<HTMLAudioElement | HTMLVideoElement | null>
}

export function ExpandedPlayerHeader({ mediaRef }: ExpandedPlayerHeaderProps) {
  const { t } = useTranslation()

  // Get player state from store
  const {
    currentSession,
    collapse,
    hide,
  } = usePlayerStore()

  // Get transcript data and state management
  const {
    availableTranscripts,
    setPrimaryLanguage,
    setSecondaryLanguage,
    primaryLanguage,
    secondaryLanguage,
  } = useTranscriptDisplay()

  // Retranscribe functionality (only for status, actual retranscribe is handled in RetranscribeDialog)
  const { isTranscribing, progress: retranscribeProgress } = useRetranscribe({
    mediaRef,
  })

  // Upload subtitle functionality
  const {
    triggerFileSelect,
    handleFileSelect,
    fileInputRef,
    isUploading: isUploadingSubtitle,
  } = useUploadSubtitle()

  // Local state for dialogs
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  // Build language options
  const languageOptions = useMemo(
    () =>
      availableTranscripts.map((t) => ({
        value: t.language,
        label: LANGUAGE_NAMES[t.language] || t.language.toUpperCase(),
      })),
    [availableTranscripts]
  )

  // Secondary language options - filtered to exclude primary
  const secondaryLanguageOptions = useMemo(
    () => languageOptions.filter((o) => o.value !== primaryLanguage),
    [languageOptions, primaryLanguage]
  )

  // Handle retranscribe with confirmation
  const handleRetranscribeClick = useCallback(() => {
    setShowConfirmDialog(true)
  }, [])

  // Handle secondary language change
  const handleSecondaryChange = useCallback(
    (value: string) => {
      if (value === 'none') {
        setSecondaryLanguage(null)
      } else {
        setSecondaryLanguage(value)
      }
    },
    [setSecondaryLanguage]
  )

  // Handle clear secondary language
  const handleClearSecondaryLanguage = useCallback(() => {
    setSecondaryLanguage(null)
  }, [setSecondaryLanguage])

  // Get media info
  const mediaTitle = currentSession?.mediaTitle || ''
  const language = currentSession?.language || ''
  const mediaDuration = currentSession?.duration || 0

  return (
    <header
      className={cn(
        'shrink-0 flex items-center justify-between gap-2 px-4 h-14 border-b bg-background/95 backdrop-blur-sm',
        availableTranscripts.length > 0 && 'md:grid md:grid-cols-[1fr_auto_1fr]'
      )}
    >
      {/* Left: Collapse button and title - limited width on large screens */}
      <div className="flex items-center gap-3 min-w-0 max-w-[200px] sm:max-w-[280px]">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 h-9 w-9"
              onClick={collapse}
            >
              <Icon icon="lucide:chevron-down" className="w-5 h-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{t('player.collapse')}</TooltipContent>
        </Tooltip>
        <div className="min-w-0 flex-1 overflow-hidden">
          <h2 className="text-sm font-medium truncate">{mediaTitle}</h2>
          <p className="text-xs text-muted-foreground truncate">
            {language?.toUpperCase() || 'Unknown'}
          </p>
        </div>
      </div>

      {/* Center: Language selectors (only show if transcripts available) - hidden on mobile, shown in drawer */}
      {availableTranscripts.length > 0 && (
        <>
          {/* Desktop: Show in header */}
          <div className="hidden md:flex items-center gap-4 justify-center min-w-0 px-2">
            <LanguageSelector
              label={t('player.transcript.primary')}
              value={primaryLanguage}
              options={languageOptions}
              onChange={setPrimaryLanguage}
              placeholder={t('player.transcript.selectLanguage')}
            />
            <LanguageSelector
              label={t('player.transcript.secondary')}
              value={secondaryLanguage}
              options={secondaryLanguageOptions}
              onChange={handleSecondaryChange}
              placeholder={t('player.transcript.selectLanguage')}
              allowNone
              onClear={handleClearSecondaryLanguage}
            />
          </div>

        </>
      )}

      {/* Right: Action buttons (desktop only) and close button */}
      <div
        className={cn(
          'flex items-center gap-2',
          availableTranscripts.length > 0 ? 'justify-end' : 'ml-auto'
        )}
      >
        {/* Desktop: Action buttons in header */}
        {availableTranscripts.length > 0 && (
          <>
            {/* Upload Subtitle Button */}
            <div className="relative hidden md:block">
              <input
                ref={fileInputRef}
                type="file"
                accept=".srt,.vtt,.ssa,.ass"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={triggerFileSelect}
                    disabled={isUploadingSubtitle || isTranscribing || !currentSession}
                    className={cn(
                      'h-8 px-2 text-xs',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    {isUploadingSubtitle ? (
                      <>
                        <Icon icon="lucide:loader-2" className="w-3 h-3 animate-spin mr-1" />
                        {t('common.loading')}
                      </>
                    ) : (
                      <>
                        <Icon icon="lucide:upload" className="w-3 h-3 mr-1" />
                        {t('player.transcript.uploadSubtitle')}
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {t('player.transcript.uploadSubtitle')}
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Retranscribe Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRetranscribeClick}
                  disabled={isTranscribing || isUploadingSubtitle || !currentSession}
                  className={cn(
                    'hidden md:flex h-8 px-2 text-xs',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  {isTranscribing ? (
                    <>
                      <Icon icon="lucide:loader-2" className="w-3 h-3 animate-spin mr-1" />
                      {retranscribeProgress || t('player.transcript.retranscribing')}
                    </>
                  ) : (
                    <>
                      <Icon icon="lucide:refresh-cw" className="w-3 h-3 mr-1" />
                      {t('player.transcript.retranscribe')}
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {t('player.transcript.retranscribe')}
              </TooltipContent>
            </Tooltip>
          </>
        )}

        {/* Mobile: Drawer trigger button */}
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} direction="top">
          <DrawerTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden shrink-0 h-9 w-9"
            >
              <Icon icon="lucide:settings" className="w-5 h-5" />
            </Button>
          </DrawerTrigger>
          <DrawerContent className="max-h-[60vh]">
            <DrawerHeader>
              <DrawerTitle>{t('player.transcript.title')}</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-4 space-y-4">
              <div className="flex flex-col gap-4">
                <LanguageSelector
                  label={t('player.transcript.primary')}
                  value={primaryLanguage}
                  options={languageOptions}
                  onChange={setPrimaryLanguage}
                  placeholder={t('player.transcript.selectLanguage')}
                />
                <LanguageSelector
                  label={t('player.transcript.secondary')}
                  value={secondaryLanguage}
                  options={secondaryLanguageOptions}
                  onChange={handleSecondaryChange}
                  placeholder={t('player.transcript.selectLanguage')}
                  allowNone
                  onClear={handleClearSecondaryLanguage}
                />
              </div>
              <div className="flex flex-col gap-2">
                {/* Upload Subtitle Button */}
                <div className="relative">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".srt,.vtt,.ssa,.ass"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={triggerFileSelect}
                    disabled={isUploadingSubtitle || isTranscribing || !currentSession}
                    className={cn(
                      'w-full',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    {isUploadingSubtitle ? (
                      <>
                        <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin mr-2" />
                        {t('common.loading')}
                      </>
                    ) : (
                      <>
                        <Icon icon="lucide:upload" className="w-4 h-4 mr-2" />
                        {t('player.transcript.uploadSubtitle')}
                      </>
                    )}
                  </Button>
                </div>
                {/* Retranscribe Button */}
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    setDrawerOpen(false)
                    handleRetranscribeClick()
                  }}
                  disabled={isTranscribing || isUploadingSubtitle || !currentSession}
                  className={cn(
                    'w-full',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  {isTranscribing ? (
                    <>
                      <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin mr-2" />
                      {retranscribeProgress || t('player.transcript.retranscribing')}
                    </>
                  ) : (
                    <>
                      <Icon icon="lucide:refresh-cw" className="w-4 h-4 mr-2" />
                      {t('player.transcript.retranscribe')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DrawerContent>
        </Drawer>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={hide}
              className="shrink-0 h-9 w-9 text-muted-foreground hover:text-foreground"
            >
              <Icon icon="lucide:x" className="w-5 h-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{t('common.close')}</TooltipContent>
        </Tooltip>
      </div>

      {/* Retranscribe Dialog */}
      <RetranscribeDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        mediaDuration={mediaDuration}
        mediaRef={mediaRef}
      />
    </header>
  )
}

