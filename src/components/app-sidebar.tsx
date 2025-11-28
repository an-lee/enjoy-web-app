import * as React from "react"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import {
  IconDashboard,
  IconFolder,
  IconFileWord,
  IconSettings,
  IconInnerShadowTop,
} from "@tabler/icons-react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { t } = useTranslation()

  const navMain = [
    {
      title: t("common.home"),
      url: "/",
      icon: IconDashboard,
    },
    {
      title: t("common.library"),
      url: "/library",
      icon: IconFolder,
    },
    {
      title: t("common.vocabulary"),
      url: "/vocabulary",
      icon: IconFileWord,
    },
  ]

  const navSecondary = [
    {
      title: t("common.settings"),
      url: "/settings",
      icon: IconSettings,
    },
  ]

  const user = {
    name: "User",
    email: "user@example.com",
    avatar: "",
  }

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <Link to="/">
                <IconInnerShadowTop className="size-5!" />
                <span className="text-base font-semibold">{t("common.appName")}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
