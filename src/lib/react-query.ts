/**
 * React Query utilities and helpers
 *
 * This file exports commonly used React Query hooks and utilities
 * for consistent data fetching across the application.
 */

export { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

/**
 * Example usage:
 *
 * ```tsx
 * import { useQuery } from '@/lib/react-query'
 *
 * function MyComponent() {
 *   const { data, isLoading, error } = useQuery({
 *     queryKey: ['users'],
 *     queryFn: async () => {
 *       const response = await apiClient.get('/users')
 *       return response.data
 *     },
 *   })
 *
 *   if (isLoading) return <div>Loading...</div>
 *   if (error) return <div>Error: {error.message}</div>
 *
 *   return <div>{data && data.map(...)}</div>
 * }
 * ```
 */

