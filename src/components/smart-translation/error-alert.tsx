interface ErrorAlertProps {
  message: string
}

export function ErrorAlert({ message }: ErrorAlertProps) {
  return (
    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
      <p className="text-sm text-destructive">{message}</p>
    </div>
  )
}

