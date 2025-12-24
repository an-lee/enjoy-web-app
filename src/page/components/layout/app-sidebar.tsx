import * as React from "react"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import {
  IconDashboard,
  IconFolder,
  IconSettings,
  IconLanguage,
  IconMicrophone,
  IconCloud,
  IconActivity,
  IconBrandChrome,
  IconExternalLink,
} from "@tabler/icons-react"

import { NavMain } from "@/page/components/layout/nav-main"
import { NavSecondary } from "@/page/components/layout/nav-secondary"
import { NavUser } from "@/page/components/layout/nav-user"
import { ContinueLearningCard } from "@/page/components/layout/continue-learning-card"
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
} from "@/page/components/ui/sidebar"
import { useAuthStore } from "@/page/stores"

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
  ]

  const navSecondary = [
    {
      title: t("common.sync"),
      url: "/sync",
      icon: IconCloud,
    },
    {
      title: t("common.taskManager", { defaultValue: "Task Manager" }),
      url: "/task-manager",
      icon: IconActivity,
    },
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
      title: t("common.chromeExtension"),
      url: "https://chromewebstore.google.com/detail/enjoy-echo/hiijpdndbjfnffibdhajdanjekbnalob",
      icon: IconBrandChrome,
      target: "_blank",
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
        <ContinueLearningCard />
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
                    <Link to={item.url} target={item.target}>
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                      {item.target === "_blank" && <IconExternalLink className="size-4" />}
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
