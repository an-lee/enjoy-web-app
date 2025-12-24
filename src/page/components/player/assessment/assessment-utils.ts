/**
 * Utility functions and constants for assessment components
 */

import type { LucideIcon } from 'lucide-react';
import { SquareX, CirclePlus, AlertTriangle, Pause, Space, Waves, CheckCircle2, HelpCircle } from 'lucide-react';

/**
 * Score level type for 4-tier rating system
 */
export type ScoreLevel = 'excellent' | 'good' | 'fair' | 'poor';

/**
 * Score level configuration with shadcn/ui colors
 */
export interface ScoreLevelConfig {
  level: ScoreLevel;
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
  badgeClassName: string;
  progressClassName: string;
  textClassName: string;
  bgClassName: string;
}

/**
 * Get score level based on score (4-tier system)
 * - 91-100: excellent (primary/green)
 * - 81-90: good (secondary/blue)
 * - 61-80: fair (warning/orange)
 * - <60: poor (destructive/red)
 */
export function getScoreLevel(score: number): ScoreLevel {
  if (score >= 91) return 'excellent';
  if (score >= 81) return 'good';
  if (score >= 61) return 'fair';
  return 'poor';
}

/**
 * Get score level configuration with custom assessment score colors
 * Uses custom color variables defined in style.css:
 * - excellent (91-100): green
 * - good (81-90): blue
 * - fair (61-80): orange/yellow
 * - poor (<60): red
 */
export function getScoreLevelConfig(score: number): ScoreLevelConfig {
  const level = getScoreLevel(score);

  switch (level) {
    case 'excellent': // 91-100: green
      return {
        level: 'excellent',
        badgeVariant: 'default',
        badgeClassName: 'bg-score-excellent text-score-excellent-foreground',
        progressClassName: 'bg-score-excellent',
        textClassName: 'text-score-excellent',
        bgClassName: 'bg-score-excellent/10',
      };
    case 'good': // 81-90: blue
      return {
        level: 'good',
        badgeVariant: 'secondary',
        badgeClassName: 'bg-score-good text-score-good-foreground',
        progressClassName: 'bg-score-good',
        textClassName: 'text-score-good',
        bgClassName: 'bg-score-good/10',
      };
    case 'fair': // 61-80: orange/yellow
      return {
        level: 'fair',
        badgeVariant: 'outline',
        badgeClassName: 'bg-score-fair text-score-fair-foreground border-score-fair',
        progressClassName: 'bg-score-fair',
        textClassName: 'text-score-fair',
        bgClassName: 'bg-score-fair/10',
      };
    case 'poor': // <60: red
      return {
        level: 'poor',
        badgeVariant: 'destructive',
        badgeClassName: 'bg-score-poor text-score-poor-foreground',
        progressClassName: 'bg-score-poor',
        textClassName: 'text-score-poor',
        bgClassName: 'bg-score-poor/10',
      };
  }
}

/**
 * Get error type info (icon, color, hasScore)
 * Uses shadcn/ui color system with distinct colors for different error types
 */
export function getErrorTypeInfo(errorType: string): {
  icon: LucideIcon;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  hasScore: boolean;
  labelKey: string;
  explanationKey: string;
} {
  switch (errorType) {
    case 'Omission':
      return {
        icon: SquareX,
        colorClass: 'text-destructive',
        bgClass: 'bg-destructive/10',
        borderClass: 'border-l-destructive',
        hasScore: false,
        labelKey: 'player.transcript.errorTypes.omission',
        explanationKey: 'player.transcript.errorExplanations.omission',
      };
    case 'Insertion':
      return {
        icon: CirclePlus,
        colorClass: 'text-chart-2',
        bgClass: 'bg-chart-2/10',
        borderClass: 'border-l-chart-2',
        hasScore: false,
        labelKey: 'player.transcript.errorTypes.insertion',
        explanationKey: 'player.transcript.errorExplanations.insertion',
      };
    case 'Mispronunciation':
      return {
        icon: AlertTriangle,
        colorClass: 'text-destructive',
        bgClass: 'bg-destructive/10',
        borderClass: 'border-l-destructive',
        hasScore: true,
        labelKey: 'player.transcript.errorTypes.mispronunciation',
        explanationKey: 'player.transcript.errorExplanations.mispronunciation',
      };
    case 'UnexpectedBreak':
      return {
        icon: Pause,
        colorClass: 'text-chart-2',
        bgClass: 'bg-chart-2/10',
        borderClass: 'border-l-chart-2',
        hasScore: true,
        labelKey: 'player.transcript.errorTypes.unexpectedBreak',
        explanationKey: 'player.transcript.errorExplanations.unexpectedBreak',
      };
    case 'MissingBreak':
      return {
        icon: Space,
        colorClass: 'text-chart-2',
        bgClass: 'bg-chart-2/10',
        borderClass: 'border-l-chart-2',
        hasScore: true,
        labelKey: 'player.transcript.errorTypes.missingBreak',
        explanationKey: 'player.transcript.errorExplanations.missingBreak',
      };
    case 'Monotone':
      return {
        icon: Waves,
        colorClass: 'text-muted-foreground',
        bgClass: 'bg-muted/50',
        borderClass: 'border-l-muted-foreground',
        hasScore: true,
        labelKey: 'player.transcript.errorTypes.monotone',
        explanationKey: 'player.transcript.errorExplanations.monotone',
      };
    case 'None':
      return {
        icon: CheckCircle2,
        colorClass: 'text-score-excellent',
        bgClass: 'bg-score-excellent/10',
        borderClass: 'border-l-score-excellent',
        hasScore: true,
        labelKey: 'player.transcript.errorTypes.correct',
        explanationKey: 'player.transcript.errorExplanations.correct',
      };
    default:
      return {
        icon: HelpCircle,
        colorClass: 'text-foreground',
        bgClass: 'bg-muted/30',
        borderClass: 'border-l-border',
        hasScore: true,
        labelKey: errorType,
        explanationKey: 'Assessment result available.',
      };
  }
}

/**
 * Convert ticks (100ns units) to milliseconds
 */
export function ticksToMs(ticks: number): number {
  return ticks / 10000;
}

