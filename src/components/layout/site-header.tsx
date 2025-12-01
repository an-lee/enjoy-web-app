import { useLocation } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function SiteHeader() {
  const { t } = useTranslation()
  const location = useLocation()

  // Map route paths to translation keys
  const getPageTitle = () => {
    const pathname = location.pathname

    if (pathname === "/") {
      return t("dashboard.title")
    } else if (pathname.startsWith("/library")) {
      return t("library.title")
    } else if (pathname.startsWith("/vocabulary")) {
      return t("vocabulary.title")
    } else if (pathname.startsWith("/plugins/youtube")) {
      return t("plugins.youtube.title")
    } else if (pathname.startsWith("/plugins/podcast")) {
      return t("plugins.podcast.title")
    } else if (pathname.startsWith("/settings")) {
      return t("settings.title")
    } else if (pathname.startsWith("/smart-translation")) {
      return t("translation.title")
    } else if (pathname.startsWith("/echo/")) {
      return t("echo.title")
    }

    return t("common.appName")
  }

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b bg-background transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">{getPageTitle()}</h1>
      </div>
    </header>
  )
}
