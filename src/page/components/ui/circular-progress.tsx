import * as React from "react"
import { cn } from "@/shared/lib/utils"

interface CircularProgressProps {
  value: number
  size?: number
  strokeWidth?: number
  className?: string
  children?: React.ReactNode
}

/**
 * Circular progress component for displaying scores
 */
export function CircularProgress({
  value,
  size = 120,
  strokeWidth = 8,
  className,
  children,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (value / 100) * circumference

  // Get color based on score
  const getColor = (score: number): string => {
    if (score >= 91) return "stroke-green-500"
    if (score >= 81) return "stroke-blue-500"
    if (score >= 61) return "stroke-orange-500"
    return "stroke-red-500"
  }

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-muted"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn("transition-all duration-500", getColor(value))}
        />
      </svg>
      {/* Content in center */}
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  )
}

