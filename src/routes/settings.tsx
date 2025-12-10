import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useState, useEffect } from 'react'
import { SettingsTabs } from '@/components/settings'

export const Route = createFileRoute('/settings')({
  component: Settings,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      tab: (search.tab as string) || undefined,
    }
  },
})

function Settings() {
  const { t } = useTranslation()
  const { tab } = Route.useSearch()
  const [activeTab, setActiveTab] = useState(tab || 'general')

  // Update active tab when URL search param changes
  useEffect(() => {
    if (tab) {
      setActiveTab(tab)
    }
  }, [tab])

  return (
    <div className="container mx-auto max-w-6xl py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{t('settings.title')}</h1>
        <p className="text-muted-foreground">
          {t('settings.description', { defaultValue: 'Manage your application settings' })}
        </p>
      </div>

      <SettingsTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
    </div>
  )
}
