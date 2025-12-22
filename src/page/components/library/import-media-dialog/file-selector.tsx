/**
 * FileSelector - Component for selecting files via drag & drop or file picker
 */

import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/page/components/ui/button'
import { ALL_ACCEPTED_TYPES, ACCEPTED_AUDIO_TYPES } from './constants'
import type { FileSelectorProps } from './types'

export function FileSelector({
  selectedFile,
  isDragging,
  onFileSelect,
  onDragOver,
  onDragLeave,
  onDrop,
  onBrowseClick,
}: FileSelectorProps) {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    onFileSelect(file)
  }

  const handleBrowseClickInternal = async () => {
    const shouldUseFileInput = await onBrowseClick()
    if (shouldUseFileInput === false) {
      fileInputRef.current?.click()
    }
  }

  const isAudioFile =
    selectedFile && ACCEPTED_AUDIO_TYPES.includes(selectedFile.type as any)

  return (
    <div
      className={cn(
        'relative border-2 border-dashed rounded-lg p-8 text-center transition-colors',
        isDragging
          ? 'border-primary bg-primary/5'
          : 'border-muted-foreground/25 hover:border-muted-foreground/50',
        selectedFile && 'border-green-500 bg-green-500/5'
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
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
            onClick={handleBrowseClickInternal}
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
          <Button variant="outline" size="sm" onClick={handleBrowseClickInternal}>
            {t('library.import.browse')}
          </Button>
        </div>
      )}
    </div>
  )
}

