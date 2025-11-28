import * as React from "react"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import {
  IconDashboard,
  IconFolder,
  IconFileWord,
  IconSettings,
  IconLanguage,
  IconMicrophone,
  IconBrandYoutube,
  IconCast,
} from "@tabler/icons-react"

import { NavMain } from "@/components/layout/nav-main"
import { NavSecondary } from "@/components/layout/nav-secondary"
import { NavUser } from "@/components/layout/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
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

  const navGenerateContent = [
    {
      title: t("common.smartTranslation"),
      url: "/smart-translation",
      icon: IconLanguage,
    },
    {
      title: t("common.voiceSynthesis"),
      url: "/voice-synthesis",
      icon: IconMicrophone,
    },
  ]

  const navPlugins = [
    {
      title: t("common.youtube"),
      url: "/plugins/youtube",
      icon: IconBrandYoutube,
    },
    {
      title: t("common.podcast"),
      url: "/plugins/podcast",
      icon: IconCast,
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
        <SidebarGroup>
          <SidebarGroupLabel>{t("common.generateContent")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navGenerateContent.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton tooltip={item.title} asChild>
                    <Link to={item.url}>
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>{t("common.plugins")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navPlugins.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton tooltip={item.title} asChild>
                    <Link to={item.url}>
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userInfo} />
      </SidebarFooter>
    </Sidebar>
  )
}
