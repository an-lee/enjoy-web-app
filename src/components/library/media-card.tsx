/**
 * MediaCard - Display card for audio/video items in the library
 */

import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { GenerativeCover } from './generative-cover'
import type { LibraryMedia } from '@/hooks/queries'

// ============================================================================
// Types
// ============================================================================

export interface MediaCardProps {
  item: LibraryMedia
  onPlay?: (item: LibraryMedia) => void
  onDelete?: (item: LibraryMedia) => void
  isDeleting?: boolean
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// ============================================================================
// Component
// ============================================================================

export function MediaCard({
  item,
  onPlay,
  onDelete,
  isDeleting = false,
}: MediaCardProps) {
  const { t } = useTranslation()
  const [imageError, setImageError] = useState(false)

  const handleImageError = useCallback(() => {
    setImageError(true)
  }, [])

  const handlePlay = useCallback(() => {
    onPlay?.(item)
  }, [item, onPlay])

  const handleDelete = useCallback(() => {
    onDelete?.(item)
  }, [item, onDelete])

  const isAudio = item.type === 'audio'

  return (
    <Card
      className={cn(
        'group overflow-hidden transition-all duration-200',
        'hover:shadow-lg hover:border-primary/30',
        'cursor-pointer',
        'py-0'
      )}
      onClick={handlePlay}
    >
      {/* Thumbnail / Cover */}
      <div className="relative aspect-video bg-muted/50 overflow-hidden">
        {item.thumbnailUrl && !imageError ? (
          <img
            src={item.thumbnailUrl}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={handleImageError}
          />
        ) : (
          <GenerativeCover
            seed={item.audio?.aid || item.video?.vid || item.id}
            type={isAudio ? 'audio' : 'video'}
            className="transition-transform duration-300 group-hover:scale-105"
          />
        )}

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
          <div className="bg-white/90 dark:bg-black/90 rounded-full p-3 shadow-lg">
            <Icon icon="lucide:play" className="w-8 h-8 text-primary" />
          </div>
        </div>

        {/* Duration badge */}
        <div className="absolute bottom-2 right-2">
          <Badge variant="secondary" className="bg-black/70 text-white border-0 text-xs">
            {formatDuration(item.duration)}
          </Badge>
        </div>

        {/* Type indicator */}
        <div className="absolute top-2 left-2">
          <Badge
            variant="secondary"
            className={cn(
              'border-0 text-xs',
              isAudio
                ? 'bg-purple-500/90 text-white'
                : 'bg-blue-500/90 text-white'
            )}
          >
            <Icon
              icon={isAudio ? 'lucide:music' : 'lucide:video'}
              className="w-3 h-3 mr-1"
            />
            {isAudio ? t('library.audio') : t('library.video')}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm line-clamp-2 leading-tight mb-1">
              {item.title}
            </h3>
            {item.description && (
              <p className="text-xs text-muted-foreground line-clamp-1">
                {item.description}
              </p>
            )}
          </div>

          {/* Actions menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Icon icon="lucide:more-vertical" className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handlePlay}>
                <Icon icon="lucide:play" className="w-4 h-4 mr-2" />
                {t('library.play')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-destructive focus:text-destructive"
                disabled={isDeleting}
              >
                <Icon icon="lucide:trash-2" className="w-4 h-4 mr-2" />
                {t('common.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Meta info */}
        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
          <span>{item.language.toUpperCase()}</span>
          <span>•</span>
          <span>{formatDate(item.createdAt)}</span>
        </div>
      </CardContent>
    </Card>
  )
}

