/**
 * Library Page - Browse and manage user's audio/video learning materials
 */

import { useState, useCallback } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useDebounce } from '@uidotdev/usehooks'
import { Icon } from '@iconify/react'
import { toast } from 'sonner'

import { createLogger } from '@/shared/lib/utils'
import { Button } from '@/page/components/ui/button'

// ============================================================================
// Logger
// ============================================================================

const log = createLogger({ name: 'library' })
import { Skeleton } from '@/page/components/ui/skeleton'
import {
  MediaCard,
  ImportMediaDialog,
  LibraryFilters,
  LibraryPagination,
  LibraryEmptyState,
  type MediaMetadata,
} from '@/page/components/library'
import {
  useLibrary,
  useLibraryStats,
  useDeleteLibraryItem,
  type MediaType,
  type LibraryMedia,
} from '@/page/hooks/queries'
import { saveLocalAudio, saveLocalVideo } from '@/page/db'
import { getFileHandleFromFile } from '@/page/lib/file-helpers'
import { usePlayerStore } from '@/page/stores'

// ============================================================================
// Route Configuration
// ============================================================================

export const Route = createFileRoute('/library')({
  component: Library,
})

// ============================================================================
// Constants
// ============================================================================

const PAGE_SIZE = 12

// ============================================================================
// Helper Functions
// ============================================================================

async function getMediaDuration(
  fileOrHandle: File | FileSystemFileHandle
): Promise<number> {
  // Get file from handle if needed
  const file = fileOrHandle instanceof File
    ? fileOrHandle
    : await fileOrHandle.getFile()

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const isVideo = file.type.startsWith('video/')
    const media = isVideo ? document.createElement('video') : document.createElement('audio')
    let isResolved = false

    // Add timeout to prevent hanging
    const timeout = setTimeout(() => {
      if (!isResolved) {
        isResolved = true
        URL.revokeObjectURL(url)
        reject(new Error('Timeout while loading media metadata'))
      }
    }, 30000) // 30 seconds timeout

    const cleanup = () => {
      if (!isResolved) {
        isResolved = true
        clearTimeout(timeout)
        URL.revokeObjectURL(url)
      }
    }

    media.onloadedmetadata = () => {
      if (isResolved) return
      const duration = Math.round(media.duration)
      cleanup()
      resolve(duration)
    }

    media.onerror = () => {
      if (isResolved) return
      cleanup()
      reject(new Error('Failed to load media metadata'))
    }

    // Handle potential permission errors
    media.onabort = () => {
      if (isResolved) return
      cleanup()
      reject(new Error('Media loading was aborted'))
    }

    try {
      media.src = url
    } catch (err) {
      cleanup()
      reject(new Error('Failed to set media source'))
    }
  })
}

// ============================================================================
// Component
// ============================================================================

function Library() {
  const { t } = useTranslation()

  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [mediaType, setMediaType] = useState<MediaType | 'all'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [importDialogOpen, setImportDialogOpen] = useState(false)

  // Debounce search query
  const debouncedSearch = useDebounce(searchQuery, 300)

  // Queries
  const {
    data: libraryData,
    isLoading,
    isError,
    error,
  } = useLibrary({
    page: currentPage,
    pageSize: PAGE_SIZE,
    search: debouncedSearch,
    mediaType,
  })

  const { data: stats } = useLibraryStats()

  // Mutations
  const deleteItemMutation = useDeleteLibraryItem()

  // Handlers
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query)
    setCurrentPage(1) // Reset to first page on search
  }, [])

  const handleMediaTypeChange = useCallback((type: MediaType | 'all') => {
    setMediaType(type)
    setCurrentPage(1) // Reset to first page on filter change
  }, [])

  // Player store
  const loadMedia = usePlayerStore((state) => state.loadMedia)

  const handlePlay = useCallback(
    async (item: LibraryMedia) => {
      try {
        await loadMedia(item)
      } catch (error) {
        log.error('Failed to load media:', error)
        toast.error(t('library.loadFailed'))
      }
    },
    [loadMedia, t]
  )

  const handleDelete = useCallback(
    async (item: LibraryMedia) => {
      try {
        await deleteItemMutation.mutateAsync({
          id: item.id,
          type: item.type,
        })
        toast.success(t('library.deleted'))
      } catch (err) {
        log.error('Failed to delete:', err)
        toast.error(t('library.deleteFailed'))
      }
    },
    [deleteItemMutation, t]
  )

  const handleImport = useCallback(
    async (
      fileHandle: FileSystemFileHandle | null,
      file: File,
      metadata: MediaMetadata
    ) => {
      try {
        let finalFileHandle: FileSystemFileHandle

        // If we have a FileSystemFileHandle from File System Access API, use it directly
        if (fileHandle) {
          finalFileHandle = fileHandle
        } else {
          // Convert File to FileSystemFileHandle (traditional file input)
          // Note: This requires user interaction to save the file
          const handle = await getFileHandleFromFile(file)
          if (!handle) {
            // User cancelled file save dialog - throw error to be handled by dialog
            throw new Error(t('library.import.cancelled'))
          }
          finalFileHandle = handle
        }

        const isVideo = file.type.startsWith('video/')

        // Use fileHandle to get duration to avoid ObjectURL locking issues with the original file
        // This ensures we're using a fresh file instance from the handle
        const duration = await getMediaDuration(finalFileHandle)

        // Get a fresh file instance for hash calculation to avoid conflicts with ObjectURL
        // We need to get it after duration calculation to avoid simultaneous file access
        const fileForHash = await finalFileHandle.getFile()

        // Pass the file object to avoid multiple getFile() calls which can cause permission issues
        if (isVideo) {
          await saveLocalVideo(finalFileHandle, {
            title: metadata.title,
            description: metadata.description,
            language: metadata.language,
            duration,
          }, undefined, fileForHash)
        } else {
          await saveLocalAudio(finalFileHandle, {
            title: metadata.title,
            description: metadata.description,
            language: metadata.language,
            duration,
          }, undefined, fileForHash)
        }

        toast.success(t('library.import.success'))
        // Reset to first page to see the new item
        setCurrentPage(1)
        setSearchQuery('')
        setMediaType('all')
      } catch (err) {
        log.error('Failed to import media:', err)
        // Provide more specific error messages
        if (err instanceof Error) {
          if (err.name === 'NotReadableError' || err.message.includes('could not be read')) {
            throw new Error(
              t('library.import.fileAccessError', {
                defaultValue: 'File access error. Please ensure the file is not moved or deleted, and try again.',
              })
            )
          }
        }
        // Re-throw error so ImportMediaDialog can handle it
        throw err
      }
    },
    [t]
  )

  const items = libraryData?.items ?? []
  const totalPages = libraryData?.totalPages ?? 0
  const totalCount = libraryData?.totalCount ?? 0
  const hasSearch = debouncedSearch.trim().length > 0

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('library.title')}</h1>
          <p className="text-muted-foreground mt-1">
            {stats ? (
              t('library.statsDescription', {
                total: stats.totalCount,
                audio: stats.audioCount,
                video: stats.videoCount,
              })
            ) : (
              t('library.description')
            )}
          </p>
        </div>
        <Button onClick={() => setImportDialogOpen(true)} size="lg">
          <Icon icon="lucide:upload" className="mr-2 h-4 w-4" />
          {t('library.import.importButton')}
        </Button>
      </div>

      {/* Filters */}
      <LibraryFilters
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        mediaType={mediaType}
        onMediaTypeChange={handleMediaTypeChange}
        className="mb-6"
      />

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-video w-full rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-destructive/10 p-4 mb-4">
            <Icon icon="lucide:alert-circle" className="w-8 h-8 text-destructive" />
          </div>
          <h3 className="text-lg font-medium mb-2">{t('library.error')}</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            {error instanceof Error ? error.message : t('library.errorDescription')}
          </p>
        </div>
      ) : items.length === 0 ? (
        <LibraryEmptyState
          hasSearch={hasSearch}
          onImport={() => setImportDialogOpen(true)}
        />
      ) : (
        <>
          {/* Results count */}
          {(hasSearch || mediaType !== 'all') && (
            <p className="text-sm text-muted-foreground mb-4">
              {t('library.resultsCount', { count: totalCount })}
            </p>
          )}

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((item) => (
              <MediaCard
                key={item.id}
                item={item}
                onPlay={handlePlay}
                onDelete={handleDelete}
                isDeleting={deleteItemMutation.isPending}
              />
            ))}
          </div>

          {/* Pagination */}
          <LibraryPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            className="mt-8"
          />
        </>
      )}

      {/* Import Dialog */}
      <ImportMediaDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={handleImport}
      />
    </div>
  )
}
