import { createRouter } from '@tanstack/react-router'

// Import the generated route tree
import { routeTree } from './routeTree.gen'
import { createQueryClient } from '@/page/lib/query-client'

// Create a QueryClient instance
const queryClient = createQueryClient()

// Create a new router instance with QueryClient context
export const getRouter = () => {
  const router = createRouter({
    routeTree,
    context: {
      queryClient,
    },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  })

  return router
}

// Export queryClient for use in components if needed
export { queryClient }
