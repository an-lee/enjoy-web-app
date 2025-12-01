import { createFileRoute, Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/echo/$id')({
  component: EchoPractice,
})

function EchoPractice() {
  const { t } = useTranslation()
  const { id } = Route.useParams()

  return (
    <div className="container mx-auto">
      <div className="mb-6">
        <Link to="/library">
          <Button variant="ghost" className="mb-4">
            <Icon icon="lucide:arrow-left" className="mr-2 h-4 w-4" />
            {t('common.back')}
          </Button>
        </Link>
        <h1 className="text-3xl font-bold mb-2">{t('echo.title')}</h1>
        <p className="text-muted-foreground">
          {t('echo.material')}: {id}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Video/Audio Player Area */}
        <div className="border rounded-lg p-6 bg-muted/50">
          <div className="aspect-video bg-black rounded-lg mb-4 flex items-center justify-center">
            <p className="text-muted-foreground">Video/Audio Player</p>
          </div>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" size="sm">
              <Icon icon="lucide:play" className="mr-2 h-4 w-4" />
              {t('echo.play')}
            </Button>
            <Button variant="outline" size="sm">
              <Icon icon="lucide:pause" className="mr-2 h-4 w-4" />
              {t('echo.pause')}
            </Button>
            <Button variant="outline" size="sm">
              <Icon icon="lucide:mic" className="mr-2 h-4 w-4" />
              {t('echo.record')}
            </Button>
            <Button variant="outline" size="sm">
              <Icon icon="lucide:square" className="mr-2 h-4 w-4" />
              {t('echo.stop')}
            </Button>
          </div>
        </div>

        {/* Text/Controls Area */}
        <div className="border rounded-lg p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-2">Current Sentence</h2>
            <p className="text-lg mb-4">
              This is a placeholder sentence for the echo practice interface.
            </p>
          </div>

          <div className="flex gap-2 justify-between">
            <Button variant="outline" size="sm">
              <Icon icon="lucide:chevron-left" className="mr-2 h-4 w-4" />
              {t('echo.previousSentence')}
            </Button>
            <Button variant="outline" size="sm">
              {t('echo.nextSentence')}
              <Icon icon="lucide:chevron-right" className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
