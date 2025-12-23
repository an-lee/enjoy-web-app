/**
 * useUploadSubtitle Hook
 *
 * Handles uploading and parsing subtitle files (SRT/VTT) and converting them to transcripts.
 */

import { useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { usePlayerStore } from '@/page/stores/player'
import { useCreateTranscript } from '@/page/hooks/queries'
import { parseSubtitleFile } from '@/page/lib/subtitle-parser'
import type { TranscriptInput, TargetType } from '@/page/types/db'

export function useUploadSubtitle() {
  const { t } = useTranslation()
  const currentSession = usePlayerStore((state) => state.currentSession)
  const createTranscript = useCreateTranscript()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const uploadSubtitle = useCallback(
    async (file: File, language?: string) => {
      if (!currentSession) {
        toast.error(t('player.transcript.noMedia', { defaultValue: 'No media is currently playing' }))
        return
      }

      try {
        // Parse subtitle file
        const timeline = await parseSubtitleFile(file)

        if (timeline.length === 0) {
          toast.error(t('player.transcript.emptySubtitle', { defaultValue: 'Subtitle file is empty or invalid' }))
          return
        }

        // Determine target type and ID
        const targetType: TargetType = currentSession.mediaType === 'video' ? 'Video' : 'Audio'
        const targetId = currentSession.mediaId

        // Use provided language, session language, or default to 'en'
        const transcriptLanguage = language || currentSession.language || 'en'

        // Create transcript input
        const transcriptInput: TranscriptInput = {
          targetType,
          targetId,
          language: transcriptLanguage,
          source: 'user',
          timeline,
        }

        // Save transcript
        await createTranscript.mutateAsync(transcriptInput)

        toast.success(t('player.transcript.uploadSuccess', { defaultValue: 'Subtitle uploaded successfully' }))
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : t('player.transcript.uploadFailed', { defaultValue: 'Failed to upload subtitle' })
        toast.error(errorMessage)
        throw error
      }
    },
    [currentSession, createTranscript, t]
  )

  const triggerFileSelect = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      // Validate file type
      const fileName = file.name.toLowerCase()
      if (
        !fileName.endsWith('.srt') &&
        !fileName.endsWith('.vtt') &&
        !fileName.endsWith('.ssa') &&
        !fileName.endsWith('.ass')
      ) {
        toast.error(
          t('player.transcript.invalidFileType', {
            defaultValue: 'Please select a .srt, .vtt, .ssa, or .ass file',
          })
        )
        return
      }

      await uploadSubtitle(file)

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    [uploadSubtitle, t]
  )

  return {
    uploadSubtitle,
    triggerFileSelect,
    handleFileSelect,
    fileInputRef,
    isUploading: createTranscript.isPending,
  }
}

