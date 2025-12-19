/**
 * LibraryFilters - Search and filter controls for the library
 */

import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
import { cn } from '@/shared/lib/utils'
import { Input } from '@/page/components/ui/input'
import { Button } from '@/page/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/page/components/ui/toggle-group'
import type { MediaType } from '@/page/hooks/queries'

// ============================================================================
// Types
// ============================================================================

export interface LibraryFiltersProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  mediaType: MediaType | 'all'
  onMediaTypeChange: (type: MediaType | 'all') => void
  className?: string
}

// ============================================================================
// Component
// ============================================================================

export function LibraryFilters({
  searchQuery,
  onSearchChange,
  mediaType,
  onMediaTypeChange,
  className,
}: LibraryFiltersProps) {
  const { t } = useTranslation()

  return (
    <div className={cn('flex flex-col sm:flex-row gap-4', className)}>
      {/* Search input */}
      <div className="relative flex-1">
        <Icon
          icon="lucide:search"
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
        />
        <Input
          type="search"
          placeholder={t('library.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 pr-9"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={() => onSearchChange('')}
          >
            <Icon icon="lucide:x" className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Media type filter */}
      <ToggleGroup
        type="single"
        value={mediaType}
        onValueChange={(value) => {
          if (value) onMediaTypeChange(value as MediaType | 'all')
        }}
        className="justify-start"
      >
        <ToggleGroupItem value="all" aria-label={t('library.filter.all')}>
          <Icon icon="lucide:layout-grid" className="w-4 h-4 mr-2" />
          {t('library.filter.all')}
        </ToggleGroupItem>
        <ToggleGroupItem value="audio" aria-label={t('library.filter.audio')}>
          <Icon icon="lucide:music" className="w-4 h-4 mr-2" />
          {t('library.filter.audio')}
        </ToggleGroupItem>
        <ToggleGroupItem value="video" aria-label={t('library.filter.video')}>
          <Icon icon="lucide:video" className="w-4 h-4 mr-2" />
          {t('library.filter.video')}
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  )
}

