import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
import { Button } from '@/page/components/ui/button'

export const Route = createFileRoute('/vocabulary')({
  component: Vocabulary,
})

function Vocabulary() {
  const { t } = useTranslation()

  return (
    <div className="container mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">{t('vocabulary.title')}</h1>
        <Button>
          <Icon icon="lucide:plus" className="mr-2 h-4 w-4" />
          {t('common.add')}
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="p-4 bg-muted/50 border-b">
          <div className="grid grid-cols-3 gap-4 font-semibold">
            <div>{t('vocabulary.word')}</div>
            <div>{t('vocabulary.meaning')}</div>
            <div>{t('vocabulary.example')}</div>
          </div>
        </div>

        <div className="p-8 text-center">
          <p className="text-muted-foreground">{t('vocabulary.noWords')}</p>
        </div>
      </div>
    </div>
  )
}
