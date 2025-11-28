import * as React from "react"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import {
  IconDashboard,
  IconFolder,
  IconFileWord,
  IconSettings,
} from "@tabler/icons-react"

import { NavMain } from "@/components/layout/nav-main"
import { NavSecondary } from "@/components/layout/nav-secondary"
import { NavUser } from "@/components/layout/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useAuthStore } from "@/stores"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { t } = useTranslation()
  const { user } = useAuthStore()

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

  // Get user info from auth store, with fallback for when user is not loaded yet
  const userInfo = user
    ? {
        name: user.name,
        email: user.email,
        avatar: user.avatarUrl || "",
      }
    : {
        name: t("common.loading"),
        email: "",
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
                <img src="/logo-light.svg" alt="Logo" className="size-5!" />
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
        <NavUser user={userInfo} />
      </SidebarFooter>
    </Sidebar>
  )
}
