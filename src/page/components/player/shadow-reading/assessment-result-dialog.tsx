/**
 * AssessmentResultDialog Component
 *
 * Displays detailed pronunciation assessment results in a modal dialog.
 */

import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/page/components/ui/dialog'
import { cn } from '@/shared/lib/utils'
import type { PronunciationAssessmentResult, WordAssessment } from '@/page/types/db'

interface AssessmentResultDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assessment: PronunciationAssessmentResult
}

/**
 * Get score color class based on score value
 * 91-100: excellent (green)
 * 81-90: good (blue)
 * 61-80: fair (orange/yellow)
 * <60: poor (red)
 */
function getScoreColorClass(score: number): string {
  if (score >= 91) {
    return 'bg-score-excellent text-score-excellent-foreground'
  } else if (score >= 81) {
    return 'bg-score-good text-score-good-foreground'
  } else if (score >= 61) {
    return 'bg-score-fair text-score-fair-foreground'
  } else {
    return 'bg-score-poor text-score-poor-foreground'
  }
}

/**
 * Get error type display text
 */
function getErrorTypeText(errorType: string): string {
  const errorTypeMap: Record<string, string> = {
    None: '',
    Omission: 'Omission',
    Insertion: 'Insertion',
    Mispronunciation: 'Mispronunciation',
    UnexpectedBreak: 'Unexpected Break',
    MissingBreak: 'Missing Break',
    Monotone: 'Monotone',
  }
  return errorTypeMap[errorType] || errorType
}

export function AssessmentResultDialog({
  open,
  onOpenChange,
  assessment,
}: AssessmentResultDialogProps) {
  const { t } = useTranslation()

  const nBest = assessment.NBest?.[0]
  if (!nBest) {
    return null
  }

  const scores = nBest.PronunciationAssessment
  const words = nBest.Words || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('player.transcript.assessment.title')}</DialogTitle>
          <DialogDescription>
            {t('player.transcript.assessment.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Overall Scores */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">
                {t('player.transcript.assessment.overallScore')}
              </div>
              <div
                className={cn(
                  'text-3xl font-bold rounded-lg px-4 py-3 text-center',
                  getScoreColorClass(scores.PronScore)
                )}
              >
                {Math.round(scores.PronScore)}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">
                {t('player.transcript.assessment.accuracy')}
              </div>
              <div
                className={cn(
                  'text-2xl font-semibold rounded-lg px-4 py-3 text-center',
                  getScoreColorClass(scores.AccuracyScore)
                )}
              >
                {Math.round(scores.AccuracyScore)}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">
                {t('player.transcript.assessment.fluency')}
              </div>
              <div
                className={cn(
                  'text-2xl font-semibold rounded-lg px-4 py-3 text-center',
                  getScoreColorClass(scores.FluencyScore)
                )}
              >
                {Math.round(scores.FluencyScore)}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">
                {t('player.transcript.assessment.completeness')}
              </div>
              <div
                className={cn(
                  'text-2xl font-semibold rounded-lg px-4 py-3 text-center',
                  getScoreColorClass(scores.CompletenessScore)
                )}
              >
                {Math.round(scores.CompletenessScore)}
              </div>
            </div>
          </div>

          {/* Word-level Assessment */}
          <div className="space-y-2">
            <div className="text-sm font-medium">
              {t('player.transcript.assessment.wordLevel')}
            </div>
            <div className="space-y-1">
              {words.map((word: WordAssessment, index: number) => {
                const hasError = word.PronunciationAssessment.ErrorType !== 'None'
                const score = word.PronunciationAssessment.AccuracyScore

                return (
                  <div
                    key={index}
                    className={cn(
                      'flex items-center gap-2 p-2 rounded border',
                      hasError && 'border-destructive/50 bg-destructive/5'
                    )}
                  >
                    <span
                      className={cn(
                        'text-xs font-semibold px-2 py-1 rounded shrink-0',
                        getScoreColorClass(score)
                      )}
                    >
                      {Math.round(score)}
                    </span>
                    <span className="font-medium">{word.Word}</span>
                    {hasError && (
                      <span className="text-xs text-destructive ml-auto">
                        {getErrorTypeText(word.PronunciationAssessment.ErrorType)}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

