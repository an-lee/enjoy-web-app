import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Plus, FileUp } from 'lucide-react'

export const Route = createFileRoute('/library')({
  component: Library,
})

function Library() {
  const { t } = useTranslation()

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">{t('library.title')}</h1>
        <div className="flex gap-2">
          <Button variant="outline">
            <FileUp className="mr-2 h-4 w-4" />
            {t('library.importFile')}
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
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
