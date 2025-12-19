/**
 * GenerativeCover - Generate beautiful deterministic covers from hash/id
 *
 * Uses the md5/hash as a seed to create consistent, aesthetically pleasing
 * geometric patterns for media items without thumbnails.
 */

import React, { useMemo } from 'react'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

export interface GenerativeCoverProps {
  /** The hash/id to use as seed for generation */
  seed: string
  /** Media type for icon overlay */
  type?: 'audio' | 'video'
  /** Additional class names */
  className?: string
}

// ============================================================================
// Color Palettes - Curated for aesthetic appeal
// ============================================================================

const COLOR_PALETTES = [
  // Sunset warm
  ['#FF6B6B', '#FEC89A', '#FFD93D', '#6BCB77'],
  // Ocean cool
  ['#4ECDC4', '#45B7D1', '#96CEB4', '#88D8B0'],
  // Purple dream
  ['#667eea', '#764ba2', '#f093fb', '#f5576c'],
  // Forest
  ['#134E5E', '#71B280', '#3D7068', '#A8E6CF'],
  // Minimal mono
  ['#2C3E50', '#34495E', '#5D6D7E', '#85929E'],
  // Dusty rose
  ['#D4A5A5', '#FFCFDF', '#E8B4B8', '#A67B5B'],
  // Nordic
  ['#4A5568', '#718096', '#A0AEC0', '#CBD5E0'],
  // Autumn
  ['#D35400', '#E67E22', '#F39C12', '#F1C40F'],
  // Lavender
  ['#9B59B6', '#8E44AD', '#BB8FCE', '#D7BDE2'],
  // Teal mint
  ['#16A085', '#1ABC9C', '#48C9B0', '#76D7C4'],
]

// Pattern types for variety
type PatternType = 'circles' | 'rectangles' | 'waves' | 'grid' | 'diagonal'

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert a hex string to a numeric value for seeding
 */
function hashToNumber(hash: string, offset: number = 0): number {
  let value = 0
  const startIndex = offset % Math.max(1, hash.length - 4)
  for (let i = 0; i < Math.min(8, hash.length - startIndex); i++) {
    value += hash.charCodeAt(startIndex + i) * (i + 1)
  }
  return value
}

/**
 * Seeded random number generator (deterministic)
 */
function seededRandom(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff
    return state / 0x7fffffff
  }
}

/**
 * Get a color palette based on hash
 */
function getPalette(hash: string): string[] {
  const index = hashToNumber(hash, 0) % COLOR_PALETTES.length
  return COLOR_PALETTES[index]
}

/**
 * Get pattern type based on hash
 */
function getPatternType(hash: string): PatternType {
  const patterns: PatternType[] = ['circles', 'rectangles', 'waves', 'grid', 'diagonal']
  const index = hashToNumber(hash, 4) % patterns.length
  return patterns[index]
}

/**
 * Generate gradient background
 */
function generateGradient(palette: string[], random: () => number): string {
  const angle = Math.floor(random() * 360)
  const color1 = palette[Math.floor(random() * palette.length)]
  const color2 = palette[Math.floor(random() * palette.length)]
  return `linear-gradient(${angle}deg, ${color1}20, ${color2}30)`
}

// ============================================================================
// Pattern Generators (SVG)
// ============================================================================

function generateCircles(palette: string[], random: () => number): React.ReactElement[] {
  const elements: React.ReactElement[] = []
  const count = 3 + Math.floor(random() * 4)

  for (let i = 0; i < count; i++) {
    const cx = 10 + random() * 80
    const cy = 10 + random() * 80
    const r = 8 + random() * 25
    const color = palette[Math.floor(random() * palette.length)]
    const opacity = 0.3 + random() * 0.4

    elements.push(
      <circle
        key={`circle-${i}`}
        cx={`${cx}%`}
        cy={`${cy}%`}
        r={`${r}%`}
        fill={color}
        opacity={opacity}
      />
    )
  }

  return elements
}

function generateRectangles(palette: string[], random: () => number): React.ReactElement[] {
  const elements: React.ReactElement[] = []
  const count = 3 + Math.floor(random() * 3)

  for (let i = 0; i < count; i++) {
    const x = random() * 60
    const y = random() * 60
    const width = 20 + random() * 40
    const height = 20 + random() * 40
    const color = palette[Math.floor(random() * palette.length)]
    const opacity = 0.25 + random() * 0.35
    const rx = random() > 0.5 ? 4 + random() * 8 : 0

    elements.push(
      <rect
        key={`rect-${i}`}
        x={`${x}%`}
        y={`${y}%`}
        width={`${width}%`}
        height={`${height}%`}
        fill={color}
        opacity={opacity}
        rx={rx}
      />
    )
  }

  return elements
}

function generateWaves(palette: string[], random: () => number): React.ReactElement[] {
  const elements: React.ReactElement[] = []
  const count = 3 + Math.floor(random() * 2)

  for (let i = 0; i < count; i++) {
    const yOffset = 20 + i * 25 + random() * 10
    const amplitude = 10 + random() * 15
    const color = palette[Math.floor(random() * palette.length)]
    const opacity = 0.3 + random() * 0.3

    // Create a wavy path
    const points = []
    for (let x = 0; x <= 100; x += 5) {
      const y = yOffset + Math.sin((x / 100) * Math.PI * (2 + random())) * amplitude
      points.push(`${x},${y}`)
    }
    // Close the path at bottom
    points.push('100,100')
    points.push('0,100')

    elements.push(
      <polygon
        key={`wave-${i}`}
        points={points.join(' ')}
        fill={color}
        opacity={opacity}
      />
    )
  }

  return elements
}

function generateGrid(palette: string[], random: () => number): React.ReactElement[] {
  const elements: React.ReactElement[] = []
  const cols = 3 + Math.floor(random() * 2)
  const rows = 2 + Math.floor(random() * 2)
  const gap = 2

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (random() > 0.3) {
        const cellWidth = (100 - gap * (cols + 1)) / cols
        const cellHeight = (100 - gap * (rows + 1)) / rows
        const x = gap + col * (cellWidth + gap)
        const y = gap + row * (cellHeight + gap)
        const color = palette[Math.floor(random() * palette.length)]
        const opacity = 0.3 + random() * 0.4

        elements.push(
          <rect
            key={`grid-${row}-${col}`}
            x={`${x}%`}
            y={`${y}%`}
            width={`${cellWidth}%`}
            height={`${cellHeight}%`}
            fill={color}
            opacity={opacity}
            rx={3}
          />
        )
      }
    }
  }

  return elements
}

function generateDiagonal(palette: string[], random: () => number): React.ReactElement[] {
  const elements: React.ReactElement[] = []
  const count = 4 + Math.floor(random() * 3)

  for (let i = 0; i < count; i++) {
    const startX = -20 + random() * 80
    const width = 15 + random() * 25
    const color = palette[Math.floor(random() * palette.length)]
    const opacity = 0.25 + random() * 0.35

    // Diagonal stripe from top-left to bottom-right direction
    elements.push(
      <polygon
        key={`diagonal-${i}`}
        points={`${startX},0 ${startX + width},0 ${startX + width + 100},100 ${startX + 100},100`}
        fill={color}
        opacity={opacity}
      />
    )
  }

  return elements
}

// ============================================================================
// Component
// ============================================================================

export function GenerativeCover({
  seed,
  type = 'audio',
  className,
}: GenerativeCoverProps) {
  const { gradient, elements, accentColor } = useMemo(() => {
    const palette = getPalette(seed)
    const patternType = getPatternType(seed)
    const random = seededRandom(hashToNumber(seed, 8))

    const gradient = generateGradient(palette, random)

    let elements: React.ReactElement[]
    switch (patternType) {
      case 'circles':
        elements = generateCircles(palette, random)
        break
      case 'rectangles':
        elements = generateRectangles(palette, random)
        break
      case 'waves':
        elements = generateWaves(palette, random)
        break
      case 'grid':
        elements = generateGrid(palette, random)
        break
      case 'diagonal':
        elements = generateDiagonal(palette, random)
        break
      default:
        elements = generateCircles(palette, random)
    }

    // Pick an accent color for the icon
    const accentColor = palette[Math.floor(random() * palette.length)]

    return { gradient, elements, accentColor }
  }, [seed])

  return (
    <div
      className={cn(
        'relative w-full h-full overflow-hidden',
        className
      )}
      style={{ background: gradient }}
    >
      {/* SVG Pattern Layer */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
      >
        {elements}
      </svg>

      {/* Subtle noise texture overlay for depth */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Center icon with glass effect */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="rounded-full p-4 backdrop-blur-sm"
          style={{
            backgroundColor: `${accentColor}15`,
            border: `1px solid ${accentColor}30`,
          }}
        >
          <svg
            className="w-10 h-10"
            viewBox="0 0 24 24"
            fill="none"
            stroke={accentColor}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ opacity: 0.7 }}
          >
            {type === 'audio' ? (
              // Music note icon
              <>
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </>
            ) : (
              // Video/play icon
              <>
                <polygon points="5 3 19 12 5 21 5 3" fill={`${accentColor}30`} />
              </>
            )}
          </svg>
        </div>
      </div>
    </div>
  )
}

