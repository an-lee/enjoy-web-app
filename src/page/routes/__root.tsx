import { HeadContent, Scripts, createRootRouteWithContext, Outlet, redirect, useLocation, useNavigate } from '@tanstack/react-router'
// import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
// import { TanStackDevtools } from '@tanstack/react-devtools'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useTranslation } from 'react-i18next'
import { useEffect, useState } from 'react'
import type { QueryClient } from '@tanstack/react-query'

import '@/shared/locales/i18n'
import { createLogger } from '@/shared/lib/utils'

// ============================================================================
// Logger
// ============================================================================

const log = createLogger({ name: '__root' })

import appCss from '@/page/styles.css?url'
import { AppSidebar, SiteHeader, ThemeProvider } from '@/page/components/layout'
import { AppSidebarSkeleton } from '@/page/components/layout/app-sidebar-skeleton'
import { SiteHeaderSkeleton } from '@/page/components/layout/site-header-skeleton'
import {
  SidebarInset,
  SidebarProvider,
} from '@/page/components/ui/sidebar'
import { Toaster } from '@/page/components/ui/sonner'
import { PlayerContainer } from '@/page/components/player'
import { AppHotkeysProvider, HotkeysHelpModal, useAppHotkey } from '@/page/components/hotkeys'
import { useAuthStore, usePlayerStore } from '@/page/stores'
import { initDatabaseWithCleanup, initSyncManager, switchDatabase } from '@/page/db'

// ============================================================================
// Global Hotkeys Handler
// ============================================================================

interface GlobalHotkeysHandlerProps {
  onOpenHelp: () => void
}

function GlobalHotkeysHandler({ onOpenHelp }: GlobalHotkeysHandlerProps) {
  const navigate = useNavigate()

  // Help shortcut (?)
  useAppHotkey('global.help', () => {
    onOpenHelp()
  })

  // Search shortcut (Ctrl+K)
  useAppHotkey('global.search', (e) => {
    e.preventDefault()
    // TODO: Open command palette / search
    log.info('Open search')
  })

  // Settings shortcut (Ctrl+,)
  useAppHotkey('global.settings', (e) => {
    e.preventDefault()
    navigate({ to: '/settings', search: { tab: undefined } })
  }, { deps: [navigate] })

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
        {/* <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        /> */}
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

  // Safely get player mode - only use store hook after hydration (client-side)
  // In SSR, use default value to avoid hook errors
  const [playerMode, setPlayerMode] = useState<'hidden' | 'mini' | 'expanded'>('hidden')

  // Mark as hydrated after mount
  // This is the key to avoiding hydration mismatches
  useEffect(() => {
    // Small delay to ensure React hydration is complete and i18n is initialized
    const timer = setTimeout(() => {
      setIsHydrated(true)
      // After hydration, subscribe to player store to get current mode
      // This is safe because we're now on the client side
      // Get initial value immediately
      setPlayerMode(usePlayerStore.getState().mode)

      // Subscribe to mode changes
      // zustand subscribe: store.subscribe(callback) where callback receives (state, prevState)
      const unsubscribe = usePlayerStore.subscribe((state) => {
        setPlayerMode(state.mode)
      })

      return () => {
        clearTimeout(timer)
        unsubscribe()
      }
    }, 150)
    return () => clearTimeout(timer)
  }, [])

  // Safely get current user - only use store hook after hydration (client-side)
  // In SSR, use null to avoid hook errors
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null)

  // Subscribe to auth store after hydration
  useEffect(() => {
    if (!isHydrated) return

    // Get initial value immediately
    setCurrentUser(useAuthStore.getState().user)

    // Subscribe to user changes
    const unsubscribe = useAuthStore.subscribe((state) => {
      setCurrentUser(state.user)
    })

    return () => unsubscribe()
  }, [isHydrated])

  // Initialize database and sync manager after hydration
  useEffect(() => {
    // Only run on client side after hydration
    if (!isHydrated || isLoginPage) {
      return
    }

    // Initialize database and sync manager
    const initializeApp = async () => {
      try {
        // Initialize database for current user (userId will be null if not logged in)
        const userId = currentUser?.id || null
        await initDatabaseWithCleanup(userId)
        log.info(`Database initialized for user: ${userId || 'unauthenticated'}`)

        // Then initialize sync manager
        await initSyncManager({
          autoSyncOnStartup: true,
          autoSyncOnNetworkRecovery: true,
          periodicSyncInterval: 5 * 60 * 1000, // 5 minutes
        })
        log.info('Sync manager initialized')
      } catch (error) {
        log.error('Failed to initialize app:', error)
      }
    }

    initializeApp()
  }, [isHydrated, isLoginPage, currentUser?.id])

  // Handle database switching when user changes (login/logout)
  useEffect(() => {
    if (!isHydrated) {
      return
    }

    const handleUserChange = async () => {
      const state = useAuthStore.getState()
      const userId = state.user?.id || null

      try {
        // Switch to the user's database
        await switchDatabase(userId)
        log.info(`Switched to database for user: ${userId || 'unauthenticated'}`)
      } catch (error) {
        log.error('Failed to switch database:', error)
      }
    }

    handleUserChange()
  }, [isHydrated, currentUser?.id])

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
            {/* Global Player - renders in mini or expanded mode */}
            {isHydrated && !isLoginPage && <PlayerContainer />}
          </SidebarProvider>
        )}


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
