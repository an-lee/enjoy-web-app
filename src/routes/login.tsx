import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useEffect, useState } from 'react'
import { useAuthStore, type User } from '@/stores'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle } from 'lucide-react'
import { api } from '@/lib/api'

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      redirect: (search.redirect as string) || undefined,
    }
  },
  component: LoginPage,
})

function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { isAuthenticated, setToken, setUser } = useAuthStore()
  const search = Route.useSearch()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check if this is a popup window (opened by this page)
  const [popupWindow, setPopupWindow] = useState<Window | null>(null)

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const redirectTo = search.redirect || '/'
      navigate({ to: redirectTo as any })
    }
  }, [isAuthenticated, navigate, search.redirect])

  // Listen for postMessage from main site (after OAuth login completes)
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Security: Only accept messages from main site origin
      const MAIN_SITE_URL = import.meta.env.VITE_MAIN_SITE_URL || 'https://echo.enjoy.bot'
      const mainSiteOrigin = new URL(MAIN_SITE_URL).origin

      if (event.origin !== mainSiteOrigin && event.origin !== window.location.origin) {
        return
      }

      // Handle auth success message from main site
      if (event.data?.type === 'ENJOY_ECHO_AUTH_SUCCESS' || event.data?.type === 'ENJOY_AUTH_TOKEN') {
        const { accessToken, token, user: userData } = event.data
        const accessTokenValue = accessToken || token

        if (!accessTokenValue) {
          console.error('No token received in auth message')
          return
        }

        setIsLoading(true)
        setError(null)

        try {
          // Set token
          setToken(accessTokenValue)

          // Get user data
          let finalUser: User | null = null
          if (userData) {
            finalUser = userData as User
            setUser(finalUser)
          } else {
            // Fetch user profile if not provided
            try {
              const profileResponse = await api.auth.profile()
              finalUser = profileResponse.data as User
              setUser(finalUser)
            } catch (err) {
              console.error('Failed to fetch user profile:', err)
              // Continue even if profile fetch fails
            }
          }

          // Close popup if it was opened by this page
          if (popupWindow && !popupWindow.closed) {
            popupWindow.close()
            setPopupWindow(null)
          }

          // Redirect to home or specified redirect
          const redirectTo = search.redirect || '/'
          navigate({ to: redirectTo as any })
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : t('auth.login.authError')
          setError(errorMessage)
        } finally {
          setIsLoading(false)
        }
      }

      // Handle auth error message from main site
      if (event.data?.type === 'ENJOY_ECHO_AUTH_ERROR') {
        const errorMessage = event.data.error || t('auth.login.authFailed')
        setError(errorMessage)

        // Close popup if it was opened
        if (popupWindow && !popupWindow.closed) {
          popupWindow.close()
          setPopupWindow(null)
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [navigate, search.redirect, setToken, setUser, popupWindow])

  // Open main site login in popup
  const handleOAuthLogin = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // Main site URL - should be configured via environment variable
      const MAIN_SITE_URL = import.meta.env.VITE_MAIN_SITE_URL || 'https://echo.enjoy.bot'

      // Open main site login in popup
      // Must be called directly in user interaction event handler
      const oauthUrl = `${MAIN_SITE_URL}/login`
      const popup = window.open(
        oauthUrl,
        'enjoy_echo_auth',
        'width=500,height=600,scrollbars=yes,resizable=yes,left=100,top=100'
      )

      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        // Popup was blocked by browser
        setError(t('auth.login.popupBlocked'))
        setIsLoading(false)
        return
      }

      // Focus the popup
      popup.focus()
      setPopupWindow(popup)

      // Check if popup was closed manually
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed)
          setIsLoading(false)
          setPopupWindow(null)
          // Show message if popup was closed before authentication
          if (!isAuthenticated) {
            setError(t('auth.login.popupClosed'))
          }
        }
      }, 1000)

      // Store interval ID for cleanup
      const intervalId = checkClosed

      // Cleanup function
      return () => {
        if (intervalId) {
          clearInterval(intervalId)
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('auth.login.popupBlocked')
      setError(errorMessage)
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader className="text-center space-y-1">
            <CardTitle className="text-2xl" suppressHydrationWarning>
              {t('auth.login.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive" className="mb-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {isLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground" suppressHydrationWarning>
                  {t('auth.login.processing')}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <Button
                  onClick={handleOAuthLogin}
                  disabled={isLoading}
                  size="lg"
                  className="w-full"
                >
                  <span suppressHydrationWarning>{t('auth.login.button')}</span>
                </Button>
                <p className="text-center text-xs text-muted-foreground" suppressHydrationWarning>
                  {t('auth.login.help')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
