import { HeadContent, Scripts, createRootRouteWithContext, Outlet, redirect, useLocation, useNavigate } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useTranslation } from 'react-i18next'
import { useEffect, useState } from 'react'
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
    // Skip auth check during SSR - Zustand persist hasn't hydrated yet
    // We'll handle auth check in the component on the client side
    if (typeof window === 'undefined') {
      return
    }

    const { isAuthenticated } = useAuthStore.getState()

    // Allow access to login page without authentication
    if (location.pathname === '/login') {
      return
    }

    // Redirect to login if not authenticated (client-side only)
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
        <Scripts />
      </body>
    </html>
  )
}

function RootComponent() {
  const location = useLocation()
  const navigate = useNavigate()
  const isLoginPage = location.pathname === '/login'
  const { queryClient } = Route.useRouteContext()
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  // Client-side auth check after hydration
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') {
      setIsCheckingAuth(false)
      return
    }

    // Wait for Zustand persist to hydrate from localStorage
    // Give it a brief moment to complete hydration
    const timer = setTimeout(() => {
      const state = useAuthStore.getState()
      setIsCheckingAuth(false)

      // If not authenticated and not on login page, redirect to login
      if (!state.isAuthenticated && !isLoginPage) {
        navigate({
          to: '/login',
          search: {
            redirect: location.pathname,
          },
        })
      }
    }, 50) // Short delay to allow Zustand persist to hydrate

    return () => clearTimeout(timer)
  }, [isLoginPage, location.pathname, navigate])

  // Show loading state during auth check to prevent flash
  if (isCheckingAuth && !isLoginPage) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="system" storageKey="enjoy-ui-theme">
          <div className="flex min-h-screen items-center justify-center">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
            </div>
          </div>
        </ThemeProvider>
      </QueryClientProvider>
    )
  }

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
      <ReactQueryDevtools buttonPosition="bottom-left" />
    </QueryClientProvider>
  )
}
