import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { SyncPage } from '@/components/sync'

export const Route = createFileRoute('/sync')({
  component: Sync,
})

function Sync() {
  const { t } = useTranslation()

  return (
    <div className="container mx-auto max-w-6xl py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{t('sync.title', { defaultValue: 'Sync' })}</h1>
        <p className="text-muted-foreground">
          {t('sync.description', { defaultValue: 'Manage synchronization between local and remote data' })}
        </p>
      </div>

      <SyncPage />
    </div>
  )
}
