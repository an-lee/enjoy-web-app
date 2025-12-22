/**
 * useFileSelection - Hook for handling file selection logic
 */

import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { createLogger } from '@/shared/lib/utils'
import { selectFileWithHandle } from '@/page/lib/file-helpers'
import { ALL_ACCEPTED_TYPES } from './constants'

const log = createLogger({ name: 'useFileSelection' })

export function useFileSelection(onFileSelected?: (file: File) => void) {
  const { t } = useTranslation()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedFileHandle, setSelectedFileHandle] =
    useState<FileSystemFileHandle | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileSelect = useCallback(
    (file: File | null) => {
      setError(null)
      if (!file) {
        setSelectedFile(null)
        setSelectedFileHandle(null)
        return
      }

      if (!ALL_ACCEPTED_TYPES.includes(file.type as any)) {
        setError(t('library.import.invalidFileType'))
        return
      }

      setSelectedFile(file)
      onFileSelected?.(file)
    },
    [t, onFileSelected]
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
    // Return false to indicate we should use traditional file input
    return false
  }, [handleFileSelect])

  const reset = useCallback(() => {
    setSelectedFile(null)
    setSelectedFileHandle(null)
    setIsDragging(false)
    setError(null)
  }, [])

  return {
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
  }
}

