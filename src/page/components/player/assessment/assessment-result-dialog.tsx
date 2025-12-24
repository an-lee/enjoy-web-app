/**
 * AssessmentResultDialog Component
 *
 * Displays detailed pronunciation assessment results in a modal dialog.
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/page/components/ui/dialog'
import { CircularProgress } from '@/page/components/ui/circular-progress'
import { cn } from '@/shared/lib/utils'
import type { PronunciationAssessmentResult, WordAssessment } from '@/page/types/db'
import { getScoreLevelConfig, getErrorTypeInfo } from './assessment-utils'

interface AssessmentResultDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assessment: PronunciationAssessmentResult
}

/**
 * Get word style classes based on error type and score
 */
function getWordStyle(word: WordAssessment): string {
  const { PronunciationAssessment } = word
  const score = PronunciationAssessment.AccuracyScore
  const errorType = PronunciationAssessment.ErrorType

  switch (errorType) {
    case 'Insertion':
      return 'bg-destructive/20 text-destructive line-through decoration-2'
    case 'Omission':
      return 'bg-muted text-muted-foreground opacity-60'
    case 'Mispronunciation':
      return 'bg-destructive/20 text-destructive'
    case 'UnexpectedBreak':
      return 'bg-chart-2/20 text-chart-2 border border-chart-2/30'
    case 'MissingBreak':
      return 'bg-muted text-muted-foreground border border-dashed border-border'
    case 'Monotone':
      return 'text-secondary underline decoration-secondary decoration-wavy decoration-2'
    case 'None':
    default:
      // Color text based on score for correct words using 4-tier system
      if (score == null) {
        return 'text-foreground hover:bg-muted'
      }
      const config = getScoreLevelConfig(score)
      return cn(config.textClassName, config.bgClassName.replace('bg-', 'hover:bg-'))
  }
}

export function AssessmentResultDialog({
  open,
  onOpenChange,
  assessment,
}: AssessmentResultDialogProps) {
  const { t } = useTranslation()
  const [selectedWord, setSelectedWord] = useState<WordAssessment | null>(null)

  const nBest = assessment.NBest?.[0]
  if (!nBest) {
    return null
  }

  const scores = nBest.PronunciationAssessment
  const words = nBest.Words || []

  const overallScore = Math.round(scores.PronScore)
  const accuracyScore = Math.round(scores.AccuracyScore)
  const completenessScore = Math.round(scores.CompletenessScore)
  const fluencyScore = Math.round(scores.FluencyScore)
  const prosodyScore = scores.ProsodyScore ? Math.round(scores.ProsodyScore) : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('player.transcript.assessment.title')}</DialogTitle>
          <DialogDescription>
            {t('player.transcript.assessment.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Top Section: Overall Score (Circular) + Progress Bars */}
          <div className="flex items-start gap-6">
            {/* Circular Overall Score */}
            <div className="shrink-0">
              <div className="text-sm font-medium text-muted-foreground mb-2 text-center">
                {t('player.transcript.assessment.overallScore')}
              </div>
              <CircularProgress value={overallScore} size={140} strokeWidth={10}>
                <div className="text-center">
                  <div
                    className={cn(
                      'text-4xl font-bold',
                      getScoreLevelConfig(overallScore).textClassName
                    )}
                  >
                    {overallScore}
                  </div>
                </div>
              </CircularProgress>
            </div>

            {/* Progress Bars for Sub-scores */}
            <div className="flex-1 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{t('player.transcript.assessment.accuracy')}</span>
                  <span
                    className={cn(
                      'font-semibold',
                      getScoreLevelConfig(accuracyScore).textClassName
                    )}
                  >
                    {accuracyScore}
                  </span>
                </div>
                <div className="relative h-3 w-full overflow-hidden rounded-full bg-primary/20">
                  <div
                    className={cn(
                      'h-full transition-all duration-500',
                      getScoreLevelConfig(accuracyScore).progressClassName
                    )}
                    style={{ width: `${accuracyScore}%` }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">
                    {t('player.transcript.assessment.completeness')}
                  </span>
                  <span
                    className={cn(
                      'font-semibold',
                      getScoreLevelConfig(completenessScore).textClassName
                    )}
                  >
                    {completenessScore}
                  </span>
                </div>
                <div className="relative h-3 w-full overflow-hidden rounded-full bg-primary/20">
                  <div
                    className={cn(
                      'h-full transition-all duration-500',
                      getScoreLevelConfig(completenessScore).progressClassName
                    )}
                    style={{ width: `${completenessScore}%` }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{t('player.transcript.assessment.fluency')}</span>
                  <span
                    className={cn('font-semibold', getScoreLevelConfig(fluencyScore).textClassName)}
                  >
                    {fluencyScore}
                  </span>
                </div>
                <div className="relative h-3 w-full overflow-hidden rounded-full bg-primary/20">
                  <div
                    className={cn(
                      'h-full transition-all duration-500',
                      getScoreLevelConfig(fluencyScore).progressClassName
                    )}
                    style={{ width: `${fluencyScore}%` }}
                  />
                </div>
              </div>
              {prosodyScore !== null && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{t('player.transcript.assessment.prosody')}</span>
                    <span
                      className={cn(
                        'font-semibold',
                        getScoreLevelConfig(prosodyScore).textClassName
                      )}
                    >
                      {prosodyScore}
                    </span>
                  </div>
                  <div className="relative h-3 w-full overflow-hidden rounded-full bg-primary/20">
                    <div
                      className={cn(
                        'h-full transition-all duration-500',
                        getScoreLevelConfig(prosodyScore).progressClassName
                      )}
                      style={{ width: `${prosodyScore}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Word-level Assessment */}
          <div className="space-y-3">
            <div className="text-sm font-medium">
              {t('player.transcript.assessment.pronunciationAnalysis')}
            </div>
            <div className="flex flex-wrap gap-2">
              {words.map((word: WordAssessment, index: number) => {
                const isSelected = selectedWord === word
                const wordStyle = getWordStyle(word)
                const errorType = word.PronunciationAssessment.ErrorType
                const score = word.PronunciationAssessment.AccuracyScore

                // Determine ring color for selected state
                let selectedRingColor = ''
                if (isSelected) {
                  if (errorType === 'None' && score != null) {
                    const config = getScoreLevelConfig(score)
                    selectedRingColor = config.bgClassName.replace('bg-', 'ring-')
                  } else {
                    const errorInfo = getErrorTypeInfo(errorType)
                    selectedRingColor = errorInfo.borderClass.replace('border-l-', 'ring-')
                  }
                }

                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setSelectedWord(isSelected ? null : word)}
                    className={cn(
                      'px-3 py-1.5 rounded-md font-medium transition-all',
                      'hover:scale-105 active:scale-95',
                      wordStyle,
                      isSelected && 'ring-2 ring-offset-2 ring-offset-background',
                      selectedRingColor
                    )}
                  >
                    {word.Word}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Selected Word Details */}
          {selectedWord && (
            <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">{selectedWord.Word}</h3>
                {selectedWord.PronunciationAssessment.ErrorType !== 'None' && (() => {
                  const errorInfo = getErrorTypeInfo(selectedWord.PronunciationAssessment.ErrorType)
                  const ErrorIcon = errorInfo.icon
                  return (
                    <div className={cn('flex items-center gap-2 text-sm', errorInfo.colorClass)}>
                      <ErrorIcon className="h-4 w-4" />
                      <span>{t(errorInfo.labelKey)}</span>
                    </div>
                  )
                })()}
              </div>

              <div className="space-y-3">
                {/* Accuracy Score */}
                {selectedWord.PronunciationAssessment.AccuracyScore != null && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">
                        {t('player.transcript.assessment.accuracyScore')}
                      </span>
                      <span
                        className={cn(
                          'text-lg font-bold',
                          getScoreLevelConfig(
                            selectedWord.PronunciationAssessment.AccuracyScore
                          ).textClassName
                        )}
                      >
                        {Math.round(selectedWord.PronunciationAssessment.AccuracyScore)}%
                      </span>
                    </div>
                    <div className="relative h-2 w-full overflow-hidden rounded-full bg-primary/20">
                      <div
                        className={cn(
                          'h-full transition-all duration-500',
                          getScoreLevelConfig(
                            selectedWord.PronunciationAssessment.AccuracyScore
                          ).progressClassName
                        )}
                        style={{
                          width: `${selectedWord.PronunciationAssessment.AccuracyScore}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Syllables */}
                {selectedWord.Syllables && selectedWord.Syllables.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-sm font-medium">
                      {t('player.transcript.assessment.syllables')}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {selectedWord.Syllables.map((syllable, idx) => (
                        <span key={idx}>
                          {syllable.Syllable}
                          {idx < selectedWord.Syllables!.length - 1 && ' · '}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Phonemes */}
                {selectedWord.Phonemes && selectedWord.Phonemes.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-sm font-medium">
                      {t('player.transcript.assessment.phonemes')}
                    </div>
                    <div className="text-sm text-muted-foreground font-mono">
                      /{selectedWord.Phonemes.map((p) => p.Phoneme).join('')}/
                    </div>
                  </div>
                )}

                {/* Error Warning */}
                {selectedWord.PronunciationAssessment.ErrorType !== 'None' && (() => {
                  const errorInfo = getErrorTypeInfo(selectedWord.PronunciationAssessment.ErrorType)
                  const ErrorIcon = errorInfo.icon
                  return (
                    <div
                      className={cn(
                        'flex items-start gap-2 p-3 rounded-md border',
                        errorInfo.bgClass,
                        errorInfo.borderClass
                      )}
                    >
                      <ErrorIcon className={cn('h-4 w-4 mt-0.5 shrink-0', errorInfo.colorClass)} />
                      <p className={cn('text-sm', errorInfo.colorClass)}>
                        {t(errorInfo.explanationKey)}
                      </p>
                    </div>
                  )
                })()}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

