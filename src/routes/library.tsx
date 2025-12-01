import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/library')({
  component: Library,
})

function Library() {
  const { t } = useTranslation()

  return (
    <div className="container mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">{t('library.title')}</h1>
        <div className="flex gap-2">
          <Button variant="outline">
            <Icon icon="lucide:file-up" className="mr-2 h-4 w-4" />
            {t('library.importFile')}
          </Button>
          <Button>
            <Icon icon="lucide:plus" className="mr-2 h-4 w-4" />
            {t('library.addMaterial')}
          </Button>
        </div>
      </div>

      <div className="border rounded-lg p-8 text-center">
        <p className="text-muted-foreground">{t('library.noMaterials')}</p>
      </div>
    </div>
  )
}
