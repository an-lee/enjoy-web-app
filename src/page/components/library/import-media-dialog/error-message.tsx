/**
 * ErrorMessage - Component for displaying error messages
 */

import { Icon } from '@iconify/react'

interface ErrorMessageProps {
  message: string
}

export function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-md p-3">
      <Icon icon="lucide:alert-circle" className="w-4 h-4" />
      {message}
    </div>
  )
}

