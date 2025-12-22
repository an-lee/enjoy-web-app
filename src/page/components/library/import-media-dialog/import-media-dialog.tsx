/**
 * ImportMediaDialog - Dialog for importing local audio/video files
 */

import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
import { toast } from 'sonner'
import { createLogger } from '@/shared/lib/utils'
import { Button } from '@/page/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/page/components/ui/dialog'
import { useSettingsStore } from '@/page/stores/settings'
import { saveLocalAudio, saveLocalVideo } from '@/page/db'
import { getFileHandleFromFile } from '@/page/lib/file-helpers'
import { FileSelector } from './file-selector'
import { MetadataForm } from './metadata-form'
import { ErrorMessage } from './error-message'
import { useFileSelection } from './use-file-selection'
import { getMediaDuration } from './utils'
import type { ImportMediaDialogProps } from './types'

// ============================================================================
// Logger
// ============================================================================

const log = createLogger({ name: 'ImportMediaDialog' })

// ============================================================================
// Component
// ============================================================================

export function ImportMediaDialog({
  open,
  onOpenChange,
  onSuccess,
}: ImportMediaDialogProps) {
  const { t } = useTranslation()
  const { learningLanguage } = useSettingsStore()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [language, setLanguage] = useState(learningLanguage)
  const [level, setLevel] = useState<string>('')
  const [isImporting, setIsImporting] = useState(false)

  const {
    selectedFile,
    selectedFileHandle,
    isDragging,
    error,
    setError,
    handleFileSelect,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleBrowseClick,
    reset,
  } = useFileSelection((file) => {
    // Auto-fill title from filename (without extension)
    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '')
    setTitle(nameWithoutExt)
  })

  const resetForm = useCallback(() => {
    reset()
    setTitle('')
    setDescription('')
    setLanguage(learningLanguage)
    setLevel('')
  }, [learningLanguage, reset])

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        resetForm()
      }
      onOpenChange(newOpen)
    },
    [onOpenChange, resetForm]
  )

  const handleImport = useCallback(async () => {
    if (!selectedFile || !title.trim()) return

    setIsImporting(true)
    setError(null)

    try {
      let finalFileHandle: FileSystemFileHandle

      // If we have a FileSystemFileHandle from File System Access API, use it directly
      if (selectedFileHandle) {
        finalFileHandle = selectedFileHandle
      } else {
        // Convert File to FileSystemFileHandle (traditional file input)
        // Note: This requires user interaction to save the file
        const handle = await getFileHandleFromFile(selectedFile)
        if (!handle) {
          // User cancelled file save dialog - throw error to be handled by dialog
          throw new Error(t('library.import.cancelled'))
        }
        finalFileHandle = handle
      }

      const isVideo = selectedFile.type.startsWith('video/')

      // Use fileHandle to get duration to avoid ObjectURL locking issues with the original file
      // This ensures we're using a fresh file instance from the handle
      const duration = await getMediaDuration(finalFileHandle)

      // Get a fresh file instance for hash calculation to avoid conflicts with ObjectURL
      // We need to get it after duration calculation to avoid simultaneous file access
      const fileForHash = await finalFileHandle.getFile()

      // Pass the file object to avoid multiple getFile() calls which can cause permission issues
      if (isVideo) {
        await saveLocalVideo(finalFileHandle, {
          title: title.trim(),
          description: description.trim() || undefined,
          language,
          duration,
        }, undefined, fileForHash)
      } else {
        await saveLocalAudio(finalFileHandle, {
          title: title.trim(),
          description: description.trim() || undefined,
          language,
          duration,
        }, undefined, fileForHash)
      }

      toast.success(t('library.import.success'))
      handleOpenChange(false)
      onSuccess?.()
    } catch (err) {
      log.error('Import failed:', err)
      // Provide more specific error messages
      if (err instanceof Error) {
        if (err.name === 'NotReadableError' || err.message.includes('could not be read')) {
          const errorMessage = t('library.import.fileAccessError', {
            defaultValue: 'File access error. Please ensure the file is not moved or deleted, and try again.',
          })
          setError(errorMessage)
          return
        }
      }
      // Show specific error message if available, otherwise show generic error
      const errorMessage =
        err instanceof Error ? err.message : t('library.import.failed')
      setError(errorMessage)
    } finally {
      setIsImporting(false)
    }
  }, [
    selectedFile,
    selectedFileHandle,
    title,
    description,
    language,
    handleOpenChange,
    onSuccess,
    setError,
    t,
  ])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon icon="lucide:upload" className="w-5 h-5" />
            {t('library.import.title')}
          </DialogTitle>
          <DialogDescription>{t('library.import.description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* File Selector */}
          <FileSelector
            selectedFile={selectedFile}
            isDragging={isDragging}
            onFileSelect={handleFileSelect}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onBrowseClick={handleBrowseClick}
          />

          {/* Error message */}
          {error && <ErrorMessage message={error} />}

          {/* Metadata form */}
          {selectedFile && (
            <MetadataForm
              title={title}
              description={description}
              language={language}
              level={level}
              onTitleChange={setTitle}
              onDescriptionChange={setDescription}
              onLanguageChange={setLanguage}
              onLevelChange={setLevel}
            />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleImport}
            disabled={!selectedFile || !title.trim() || isImporting}
          >
            {isImporting ? (
              <>
                <Icon icon="lucide:loader-2" className="w-4 h-4 mr-2 animate-spin" />
                {t('library.import.importing')}
              </>
            ) : (
              <>
                <Icon icon="lucide:upload" className="w-4 h-4 mr-2" />
                {t('library.import.importButton')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

