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
import { AppSidebarSkeleton } from '@/components/layout/app-sidebar-skeleton'
import { SiteHeaderSkeleton } from '@/components/layout/site-header-skeleton'
import {
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar'
import { Toaster } from '@/components/ui/sonner'
import { GlobalPlayer } from '@/components/player'
import { AppHotkeysProvider, HotkeysHelpModal, useAppHotkey } from '@/components/hotkeys'
import { useAuthStore, usePlayerStore } from '@/stores'

// ============================================================================
// Global Hotkeys Handler
// ============================================================================

function GlobalHotkeysHandler({ onOpenHelp }: { onOpenHelp: () => void }) {
  // Help shortcut (?)
  useAppHotkey('global.help', () => {
    onOpenHelp()
  })

  // Search shortcut (Ctrl+K)
  useAppHotkey('global.search', (e) => {
    e.preventDefault()
    // TODO: Open command palette / search
    console.log('Open search')
  })

  // Settings shortcut (Ctrl+,)
  useAppHotkey('global.settings', (e) => {
    e.preventDefault()
    // TODO: Navigate to settings
    console.log('Open settings')
  })

  return null
}

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
      {
        rel: 'preconnect',
        href: 'https://fonts.googleapis.com',
      },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
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
  const [lang, setLang] = useState('en')

  useEffect(() => {
    // Update HTML lang attribute when language changes
    setLang(i18n.language)
    document.documentElement.lang = i18n.language
  }, [i18n.language])

  return (
    <html lang={lang} suppressHydrationWarning>
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
  const [isCheckingAuth, setIsCheckingAuth] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  const [isHotkeysHelpOpen, setIsHotkeysHelpOpen] = useState(false)
  const playerMode = usePlayerStore((state) => state.mode)

  // Mark as hydrated after mount
  // This is the key to avoiding hydration mismatches
  useEffect(() => {
    // Small delay to ensure React hydration is complete and i18n is initialized
    const timer = setTimeout(() => {
      setIsHydrated(true)
    }, 150)
    return () => clearTimeout(timer)
  }, [])

  // Client-side auth check after hydration
  useEffect(() => {
    // Only run on client side after hydration
    if (!isHydrated || isLoginPage) {
      return
    }

    setIsCheckingAuth(true)

    // Wait for Zustand persist to hydrate from localStorage
    // Give it a brief moment to complete hydration
    const timer = setTimeout(() => {
      const state = useAuthStore.getState()
      setIsCheckingAuth(false)

      // If not authenticated and not on login page, redirect to login
      if (!state.isAuthenticated) {
        navigate({
          to: '/login',
          search: {
            redirect: location.pathname,
          },
        })
      }
    }, 50) // Short delay to allow Zustand persist to hydrate

    return () => clearTimeout(timer)
  }, [isHydrated, isLoginPage, location.pathname, navigate])

  // Show loading state during auth check to prevent flash (client-side only)
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
        <AppHotkeysProvider>
          {isLoginPage ? (
            // Login page - no sidebar or header
            <Outlet />
          ) : !isHydrated ? (
          // Show skeleton during SSR and hydration to avoid i18n mismatch
          <SidebarProvider
            style={
              {
                "--sidebar-width": "calc(var(--spacing) * 72)",
                "--header-height": "calc(var(--spacing) * 12)",
              } as React.CSSProperties
            }
          >
            <AppSidebarSkeleton variant="inset" />
            <SidebarInset>
              <SiteHeaderSkeleton />
              <div className="flex flex-1 flex-col">
                <div className="flex flex-1 flex-col gap-2">
                  <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                    <div className="px-4 lg:px-6">
                      {/* Empty skeleton content area - real content shows after hydration */}
                    </div>
                  </div>
                </div>
              </div>
            </SidebarInset>
          </SidebarProvider>
        ) : (
          // Authenticated pages - with sidebar and header (after hydration)
          <SidebarProvider
            className="h-screen"
            style={
              {
                "--sidebar-width": "calc(var(--spacing) * 72)",
                "--header-height": "calc(var(--spacing) * 12)",
              } as React.CSSProperties
            }
          >
            <AppSidebar variant="inset" />
            <SidebarInset className="flex flex-col overflow-hidden">
              <div className="flex flex-1 flex-col min-h-0 overflow-y-auto">
                <div className="shrink-0 sticky top-0 z-10 bg-background">
                  <SiteHeader />
                </div>
                <div className="flex flex-1 flex-col min-h-0">
                  <div className="flex flex-1 flex-col gap-2 min-h-0">
                    <div className={`flex flex-col gap-4 py-4 md:gap-6 md:py-6 min-h-0 h-full ${playerMode === 'mini' ? 'pb-20' : ''}`}>
                      <div className="px-4 lg:px-6 flex-1 flex flex-col min-h-0">
                        <Outlet />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </SidebarInset>
          </SidebarProvider>
        )}
          {/* Global Player - renders in mini or expanded mode */}
          {isHydrated && !isLoginPage && <GlobalPlayer />}

          {/* Hotkeys Help Modal */}
          <HotkeysHelpModal
            open={isHotkeysHelpOpen}
            onOpenChange={setIsHotkeysHelpOpen}
          />

          {/* Global Hotkeys Handler */}
          {isHydrated && !isLoginPage && (
            <GlobalHotkeysHandler onOpenHelp={() => setIsHotkeysHelpOpen(true)} />
          )}
        </AppHotkeysProvider>
      </ThemeProvider>
      <Toaster />
      <ReactQueryDevtools buttonPosition="bottom-left" />
    </QueryClientProvider>
  )
}
