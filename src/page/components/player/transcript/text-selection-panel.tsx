/**
 * TextSelectionPanel Component
 *
 * Displays translation and dictionary information for selected text.
 * Uses shadcn Popover component to show the panel below the selection.
 */

import { useState, useEffect } from 'react'
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
}

export function TextSelectionPanel({
  selection,
  sourceLanguage,
  open,
  onOpenChange,
}: TextSelectionPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const nativeLanguage = useSettingsStore((s) => s.nativeLanguage)

  // Update open state when selection changes
  useEffect(() => {
    setIsOpen(!!selection && (open ?? true))
  }, [selection, open])

  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen)
    onOpenChange?.(newOpen)
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
        className="w-[400px] max-w-[90vw] p-0"
        align="start"
        side="bottom"
        sideOffset={8}
        onOpenAutoFocus={(e) => e.preventDefault()}
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

