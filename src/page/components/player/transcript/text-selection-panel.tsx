/**
 * TextSelectionPanel Component
 *
 * Displays translation and dictionary information for selected text.
 * Uses shadcn Popover component to show the panel below the selection.
 */

import { useQuery } from '@tanstack/react-query'
import { Popover, PopoverContent, PopoverAnchor } from '@/page/components/ui/popover'
import { Card, CardContent, CardHeader, CardTitle } from '@/page/components/ui/card'
import { Skeleton } from '@/page/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/page/components/ui/tabs'
import { Icon } from '@iconify/react'
import { dictionaryApi } from '@/page/api/dictionary'
import { useSettingsStore } from '@/page/stores/settings'
import type { TextSelection } from '@/page/hooks/player/use-text-selection'

interface TextSelectionPanelProps {
  /** Current text selection */
  selection: TextSelection | null
  /** Source language of the selected text */
  sourceLanguage: string
  /** Whether the panel is open */
  open?: boolean
  /** Callback when panel should close */
  onOpenChange?: (open: boolean) => void
  /** Ref to attach to the popover content element */
  popoverContentRef?: React.RefObject<HTMLDivElement | null>
}

export function TextSelectionPanel({
  selection,
  sourceLanguage,
  open,
  onOpenChange,
  popoverContentRef,
}: TextSelectionPanelProps) {
  const nativeLanguage = useSettingsStore((s) => s.nativeLanguage)

  // Control Popover open state based on selection
  // Popover should be open when selection exists
  const isOpen = !!selection && (open ?? true)

  const handleOpenChange = (newOpen: boolean) => {
    // If Popover is trying to close but we still have a selection,
    // prevent the close. The selection will be cleared by useTextSelection's
    // click-outside handler, which will then properly close the Popover.
    if (!newOpen && selection) {
      // Don't allow Popover to close while selection exists
      // The Popover is controlled by selection state, not by user interaction
      return
    }

    // Only call onOpenChange if we're actually closing (selection is null)
    if (!newOpen) {
      onOpenChange?.(newOpen)
    }
  }

  // Query dictionary data
  const {
    data: dictionaryData,
    isLoading: isDictionaryLoading,
    error: dictionaryError,
  } = useQuery({
    queryKey: ['dictionary', selection?.text, sourceLanguage, nativeLanguage],
    queryFn: async () => {
      if (!selection?.text) {
        return null
      }
      const response = await dictionaryApi.lookupBasic({
        word: selection.text.trim(),
        sourceLanguage,
        targetLanguage: nativeLanguage,
      })
      return response.success ? response.data : null
    },
    enabled: !!selection?.text && isOpen,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })

  if (!selection) {
    return null
  }

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverAnchor asChild>
        {/* Invisible anchor positioned at the selection */}
        <div
          style={{
            position: 'fixed',
            left: selection.rect.left,
            top: selection.rect.bottom,
            width: selection.rect.width,
            height: 1,
            pointerEvents: 'none',
            zIndex: -1,
          }}
        />
      </PopoverAnchor>
      <PopoverContent
        ref={popoverContentRef}
        className="w-[400px] max-w-[90vw] p-0"
        align="start"
        side="bottom"
        sideOffset={8}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => {
          // Always prevent Popover's default close behavior
          // We'll handle closing through useTextSelection's click-outside handler
          // which will clear the selection, which will then close the Popover
          e.preventDefault()
        }}
        onEscapeKeyDown={(e) => {
          // Prevent ESC from closing while selection exists
          // The selection will be cleared by useTextSelection, which will close the Popover
          if (selection) {
            e.preventDefault()
          }
        }}
      >
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              {selection.text}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Tabs defaultValue="dictionary" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="dictionary" className="text-xs">
                  <Icon icon="lucide:book" className="w-4 h-4 mr-1.5" />
                  Dictionary
                </TabsTrigger>
                <TabsTrigger value="translation" className="text-xs">
                  <Icon icon="lucide:languages" className="w-4 h-4 mr-1.5" />
                  Translation
                </TabsTrigger>
              </TabsList>

              <TabsContent value="dictionary" className="mt-4 space-y-3">
                {isDictionaryLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ) : dictionaryError ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Icon icon="lucide:alert-circle" className="w-4 h-4" />
                    <span>Failed to load dictionary</span>
                  </div>
                ) : dictionaryData ? (
                  <div className="space-y-3">
                    {dictionaryData.definitions.map((def, index) => (
                      <div key={index} className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-primary">
                            {def.partOfSpeech}
                          </span>
                          <span className="text-sm font-medium">
                            {def.translation}
                          </span>
                        </div>
                        {def.examples && def.examples.length > 0 && (
                          <div className="pl-4 border-l-2 border-muted space-y-1">
                            {def.examples.map((example, exIndex) => (
                              <p
                                key={exIndex}
                                className="text-xs text-muted-foreground italic"
                              >
                                {example}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Icon icon="lucide:info" className="w-4 h-4" />
                    <span>No dictionary entry found</span>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="translation" className="mt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Icon icon="lucide:info" className="w-4 h-4" />
                  <span>Translation feature coming soon</span>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  )
}

