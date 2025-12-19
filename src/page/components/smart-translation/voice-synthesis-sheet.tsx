import { useTranslation } from 'react-i18next'
import { Label } from '@/page/components/ui/label'
import { Button } from '@/page/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/page/components/ui/sheet'
import { Icon } from '@iconify/react'
import { VoiceSelector } from '@/page/components/voice-synthesis'

export interface VoiceSynthesisSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  text: string
  language: string
  voice: string
  onVoiceChange: (voice: string) => void
  onSynthesize: () => void
  isSynthesizing: boolean
}

export function VoiceSynthesisSheet({
  open,
  onOpenChange,
  text,
  language,
  voice,
  onVoiceChange,
  onSynthesize,
  isSynthesizing,
}: VoiceSynthesisSheetProps) {
  const { t } = useTranslation()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader className="px-6">
          <SheetTitle>{t('tts.synthesizeAudio', { defaultValue: 'Synthesize Audio' })}</SheetTitle>
          <SheetDescription>
            {t('tts.synthesizeDescription', {
              defaultValue: 'Generate audio from the translated text',
            })}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-6 py-4">
          <VoiceSelector
            voice={voice}
            onVoiceChange={onVoiceChange}
            language={language}
            disabled={isSynthesizing}
          />

          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {t('translation.translatedText')}
            </Label>
            <p className="text-sm text-muted-foreground p-3 bg-muted rounded-md">
              {text}
            </p>
          </div>
        </div>

        <SheetFooter className="flex-col sm:flex-row gap-2 px-6 pb-6">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSynthesizing}
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={onSynthesize}
            disabled={isSynthesizing}
            className="min-w-[120px]"
          >
            {isSynthesizing ? (
              <>
                <Icon icon="lucide:loader-2" className="mr-2 h-4 w-4 animate-spin" />
                {t('tts.synthesizing')}
              </>
            ) : (
              t('tts.synthesize')
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

