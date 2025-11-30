/**
 * Progress Normalization Utilities
 */

/**
 * Normalize progress value to 0-1 range
 * transformers.js may return progress as 0-1 or 0-100
 */
export function normalizeProgress(progressData: any): number {
  if (!progressData || typeof progressData.progress !== 'number') {
    return 0
  }

  let progress = progressData.progress

  // If progress is already 0-1, return as is (clamped to 0-1)
  if (progress <= 1) {
    return Math.max(0, Math.min(1, progress))
  }

  // If progress is 0-100, convert to 0-1
  if (progress <= 100) {
    return Math.max(0, Math.min(1, progress / 100))
  }

  // If progress > 100, clamp to 1
  return 1
}

