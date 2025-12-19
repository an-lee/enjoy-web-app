import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

export const Route = createFileRoute('/')({
  component: Home,
})

export function Home() {
  const { t } = useTranslation()

  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold mb-2">{t('dashboard.title')}</h1>
      <p className="text-muted-foreground">{t('dashboard.welcome')}</p>
    </div>
  )
}
