/**
 * LibraryEmptyState - Empty state display for the library
 */

import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
import { Button } from '@/page/components/ui/button'

// ============================================================================
// Types
// ============================================================================

export interface LibraryEmptyStateProps {
  hasSearch: boolean
  onImport?: () => void
}

// ============================================================================
// Component
// ============================================================================

export function LibraryEmptyState({ hasSearch, onImport }: LibraryEmptyStateProps) {
  const { t } = useTranslation()

  if (hasSearch) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Icon icon="lucide:search-x" className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">{t('library.noSearchResults')}</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          {t('library.noSearchResultsDescription')}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="relative mb-6">
        <div className="rounded-full bg-linear-to-br from-primary/20 to-primary/5 p-6">
          <Icon icon="lucide:library" className="w-12 h-12 text-primary" />
        </div>
        <div className="absolute -bottom-1 -right-1 rounded-full bg-background p-1.5 shadow-lg">
          <Icon icon="lucide:plus-circle" className="w-5 h-5 text-primary" />
        </div>
      </div>
      <h3 className="text-xl font-semibold mb-2">{t('library.emptyTitle')}</h3>
      <p className="text-sm text-muted-foreground max-w-md mb-6">
        {t('library.emptyDescription')}
      </p>
      {onImport && (
        <Button onClick={onImport} size="lg">
          <Icon icon="lucide:upload" className="w-4 h-4 mr-2" />
          {t('library.import.importButton')}
        </Button>
      )}
    </div>
  )
}

