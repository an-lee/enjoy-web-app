/**
 * ImportMediaDialog - Dialog for importing local audio/video files
 */

import { useState, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
import { cn, createLogger } from '@/shared/lib/utils'
import { Button } from '@/page/components/ui/button'

// ============================================================================
// Logger
// ============================================================================

const log = createLogger({ name: 'ImportMediaDialog' })
import { Input } from '@/page/components/ui/input'
import { Label } from '@/page/components/ui/label'
import { Textarea } from '@/page/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/page/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/page/components/ui/select'
import { useSettingsStore } from '@/page/stores/settings'
import { selectFileWithHandle } from '@/page/lib/file-helpers'

// ============================================================================
// Types
// ============================================================================

export interface ImportMediaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (file: File | FileSystemFileHandle, metadata: MediaMetadata) => Promise<void>
}

export interface MediaMetadata {
  title: string
  description?: string
  language: string
}

// ============================================================================
// Constants
// ============================================================================

const ACCEPTED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/ogg',
  'audio/webm',
  'audio/m4a',
  'audio/aac',
]

const ACCEPTED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'video/x-msvideo',
]

const ALL_ACCEPTED_TYPES = [...ACCEPTED_AUDIO_TYPES, ...ACCEPTED_VIDEO_TYPES]

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'zh', name: '中文' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'pt', name: 'Português' },
]

const LEVELS = ['beginner', 'intermediate', 'advanced'] as const

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
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedFileHandle, setSelectedFileHandle] = useState<FileSystemFileHandle | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [language, setLanguage] = useState(learningLanguage)
  const [level, setLevel] = useState<string>('')
  const [isImporting, setIsImporting] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetForm = useCallback(() => {
    setSelectedFile(null)
    setSelectedFileHandle(null)
    setTitle('')
    setDescription('')
    setLanguage(learningLanguage)
    setLevel('')
    setError(null)
  }, [learningLanguage])

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        resetForm()
      }
      onOpenChange(newOpen)
    },
    [onOpenChange, resetForm]
  )

  const handleFileSelect = useCallback(
    (file: File | null) => {
      setError(null)
      if (!file) return

      if (!ALL_ACCEPTED_TYPES.includes(file.type)) {
        setError(t('library.import.invalidFileType'))
        return
      }

      setSelectedFile(file)
      // Auto-fill title from filename (without extension)
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '')
      setTitle(nameWithoutExt)
    },
    [t]
  )

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] || null
      handleFileSelect(file)
    },
    [handleFileSelect]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files?.[0] || null
      handleFileSelect(file)
    },
    [handleFileSelect]
  )

  const handleBrowseClick = useCallback(async () => {
    // Try to use File System Access API first if supported
    if ('showOpenFilePicker' in window) {
      try {
        const fileHandle = await selectFileWithHandle({
          types: [
            {
              description: 'Media files',
              accept: {
                'audio/*': ['.mp3', '.wav', '.ogg', '.webm', '.m4a', '.aac'],
                'video/*': ['.mp4', '.webm', '.ogg', '.mov', '.avi'],
              },
            },
          ],
        })
        if (fileHandle) {
          const file = await fileHandle.getFile()
          setSelectedFileHandle(fileHandle)
          handleFileSelect(file)
        }
        return
      } catch (err) {
        // User cancelled or error - fall back to input
        if ((err as Error).name !== 'AbortError') {
          log.error('Failed to select file with File System Access API:', err)
        }
      }
    }
    // Fall back to traditional file input
    fileInputRef.current?.click()
  }, [handleFileSelect])

  const handleImport = useCallback(async () => {
    if ((!selectedFile && !selectedFileHandle) || !title.trim()) return

    setIsImporting(true)
    setError(null)

    try {
      // Prefer fileHandle if available (from File System Access API)
      const fileOrHandle = selectedFileHandle || selectedFile
      if (!fileOrHandle) return

      await onImport(fileOrHandle, {
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
  }, [selectedFile, selectedFileHandle, title, description, language, level, onImport, handleOpenChange, t])

  const isAudioFile = selectedFile && ACCEPTED_AUDIO_TYPES.includes(selectedFile.type)

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
          {/* File Drop Zone */}
          <div
            className={cn(
              'relative border-2 border-dashed rounded-lg p-8 text-center transition-colors',
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-muted-foreground/50',
              selectedFile && 'border-green-500 bg-green-500/5'
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ALL_ACCEPTED_TYPES.join(',')}
              onChange={handleFileInputChange}
              className="hidden"
            />

            {selectedFile ? (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <Icon
                    icon={isAudioFile ? 'lucide:music' : 'lucide:video'}
                    className={cn(
                      'w-8 h-8',
                      isAudioFile ? 'text-purple-500' : 'text-blue-500'
                    )}
                  />
                </div>
                <p className="text-sm font-medium">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB •{' '}
                  {isAudioFile ? t('library.audio') : t('library.video')}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBrowseClick}
                  className="text-xs"
                >
                  {t('library.import.changeFile')}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <Icon
                  icon="lucide:cloud-upload"
                  className="w-10 h-10 mx-auto text-muted-foreground/50"
                />
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t('library.import.dropZone')}
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    {t('library.import.supportedFormats')}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={handleBrowseClick}>
                  {t('library.import.browse')}
                </Button>
              </div>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-md p-3">
              <Icon icon="lucide:alert-circle" className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* Metadata form */}
          {selectedFile && (
            <div className="space-y-4">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">{t('library.import.titleLabel')} *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('library.import.titlePlaceholder')}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">{t('library.import.descriptionLabel')}</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('library.import.descriptionPlaceholder')}
                  rows={2}
                />
              </div>

              {/* Language & Level */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('library.import.languageLabel')}</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t('library.import.levelLabel')}</Label>
                  <Select value={level} onValueChange={setLevel}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('library.import.levelPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {LEVELS.map((lvl) => (
                        <SelectItem key={lvl} value={lvl}>
                          {t(`library.level.${lvl}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleImport}
            disabled={(!selectedFile && !selectedFileHandle) || !title.trim() || isImporting}
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

