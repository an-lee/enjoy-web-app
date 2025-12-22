/**
 * Constants for ImportMediaDialog
 */

export const ACCEPTED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/ogg',
  'audio/webm',
  'audio/m4a',
  'audio/aac',
] as const

export const ACCEPTED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'video/x-msvideo',
] as const

export const ALL_ACCEPTED_TYPES = [
  ...ACCEPTED_AUDIO_TYPES,
  ...ACCEPTED_VIDEO_TYPES,
]

export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'zh', name: '中文' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'pt', name: 'Português' },
] as const

export const LEVELS = ['beginner', 'intermediate', 'advanced'] as const

