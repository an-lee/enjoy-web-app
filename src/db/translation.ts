import { db } from './database'
import type { Translation, SyncStatus, TranslationStyle } from './schema'

export async function getTranslationByTextAndStyle(
  sourceText: string,
  targetLanguage: string,
  style: TranslationStyle
): Promise<Translation | undefined> {
  return db.translations
    .where('[sourceText+targetLanguage+style]')
    .equals([sourceText, targetLanguage, style])
    .first()
}

export async function getTranslationsBySourceText(
  sourceText: string
): Promise<Translation[]> {
  return db.translations.where('sourceText').equals(sourceText).toArray()
}

export async function getTranslationsBySourceLanguage(
  sourceLanguage: string
): Promise<Translation[]> {
  return db.translations.where('sourceLanguage').equals(sourceLanguage).toArray()
}

export async function getTranslationsByTargetLanguage(
  targetLanguage: string
): Promise<Translation[]> {
  return db.translations.where('targetLanguage').equals(targetLanguage).toArray()
}

export async function getTranslationsByStyle(
  style: TranslationStyle
): Promise<Translation[]> {
  return db.translations.where('style').equals(style).toArray()
}

export async function getTranslationsBySyncStatus(
  status: SyncStatus
): Promise<Translation[]> {
  return db.translations.where('syncStatus').equals(status).toArray()
}

