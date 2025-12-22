/**
 * ImportMediaDialog - Dialog for importing local audio/video files
 */

import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
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
import { FileSelector } from './file-selector'
import { MetadataForm } from './metadata-form'
import { ErrorMessage } from './error-message'
import { useFileSelection } from './use-file-selection'
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
  onImport,
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
      await onImport(selectedFileHandle, selectedFile, {
        title: title.trim(),
        description: description.trim() || undefined,
        language,
      })
      handleOpenChange(false)
    } catch (err) {
      log.error('Import failed:', err)
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
    onImport,
    handleOpenChange,
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

