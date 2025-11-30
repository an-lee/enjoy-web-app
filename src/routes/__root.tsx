import { HeadContent, Scripts, createRootRouteWithContext, Outlet, redirect, useLocation } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useTranslation } from 'react-i18next'
import { useEffect } from 'react'
import type { QueryClient } from '@tanstack/react-query'

import '../lib/i18n'

import appCss from '../styles.css?url'
import { AppSidebar, SiteHeader, ThemeProvider } from '@/components/layout'
import {
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar'
import { useAuthStore } from '@/stores'

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Enjoy Echo',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),

  beforeLoad: ({ location }) => {
    const { isAuthenticated } = useAuthStore.getState()

    // Allow access to login page without authentication
    if (location.pathname === '/login') {
      return
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.pathname,
        },
      })
    }
  },

  component: RootComponent,
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation()

  useEffect(() => {
    // Update HTML lang attribute when language changes
    document.documentElement.lang = i18n.language
  }, [i18n.language])

  return (
    <html lang={i18n.language} suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <ReactQueryDevtools buttonPosition="bottom-left" />
        <Scripts />
      </body>
    </html>
  )
}

function RootComponent() {
  const location = useLocation()
  const isLoginPage = location.pathname === '/login'
  const { queryClient } = Route.useRouteContext()

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="enjoy-ui-theme">
        {isLoginPage ? (
          // Login page - no sidebar or header
          <Outlet />
        ) : (
          // Authenticated pages - with sidebar and header
          <SidebarProvider
            style={
              {
                "--sidebar-width": "calc(var(--spacing) * 72)",
                "--header-height": "calc(var(--spacing) * 12)",
              } as React.CSSProperties
            }
          >
            <AppSidebar variant="inset" />
            <SidebarInset>
              <SiteHeader />
              <div className="flex flex-1 flex-col">
                <div className="flex flex-1 flex-col gap-2">
                  <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                    <div className="px-4 lg:px-6">
                      <Outlet />
                    </div>
                  </div>
                </div>
              </div>
            </SidebarInset>
          </SidebarProvider>
        )}
      </ThemeProvider>
    </QueryClientProvider>
  )
}
