/**
 * Credits Usage Page - View user credits usage records
 */

import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useState, useCallback } from 'react'
import { Icon } from '@iconify/react'

import { Button } from '@/page/components/ui/button'
import { Input } from '@/page/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/page/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/page/components/ui/table'
import { Skeleton } from '@/page/components/ui/skeleton'
import { Badge } from '@/page/components/ui/badge'
import { useCreditsUsageLogs } from '@/page/hooks/queries'

export const Route = createFileRoute('/credits')({
  component: Credits,
})

// ============================================================================
// Constants
// ============================================================================

const PAGE_SIZE = 50
const SERVICE_TYPES = [
  { value: 'all', translationKey: 'credits.serviceTypes.all' },
  { value: 'tts', translationKey: 'credits.serviceTypes.tts' },
  { value: 'asr', translationKey: 'credits.serviceTypes.asr' },
  { value: 'translation', translationKey: 'credits.serviceTypes.translation' },
  { value: 'llm', translationKey: 'credits.serviceTypes.llm' },
  { value: 'assessment', translationKey: 'credits.serviceTypes.assessment' },
] as const

// ============================================================================
// Helper Functions
// ============================================================================

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
  } catch {
    return dateStr
  }
}

function formatTimestamp(timestamp: number): string {
  try {
    const date = new Date(timestamp)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return new Date(timestamp).toLocaleString()
  }
}

// ============================================================================
// Component
// ============================================================================

function Credits() {
  const { t } = useTranslation()

  // State
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [serviceType, setServiceType] = useState('all')
  const [offset, setOffset] = useState(0)

  // Reset offset when filters change
  const handleFilterChange = useCallback(() => {
    setOffset(0)
  }, [])

  // Query
  const { data, isLoading, isError, error, refetch } = useCreditsUsageLogs({
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    serviceType: serviceType && serviceType !== 'all' ? serviceType : undefined,
    limit: PAGE_SIZE,
    offset,
  })

  const logs = data?.logs ?? []
  const hasMore = logs.length === PAGE_SIZE
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1

  // Handlers
  const handleStartDateChange = useCallback(
    (value: string) => {
      setStartDate(value)
      handleFilterChange()
    },
    [handleFilterChange]
  )

  const handleEndDateChange = useCallback(
    (value: string) => {
      setEndDate(value)
      handleFilterChange()
    },
    [handleFilterChange]
  )

  const handleServiceTypeChange = useCallback(
    (value: string) => {
      setServiceType(value)
      handleFilterChange()
    },
    [handleFilterChange]
  )

  const handlePreviousPage = useCallback(() => {
    setOffset((prev) => Math.max(0, prev - PAGE_SIZE))
  }, [])

  const handleNextPage = useCallback(() => {
    if (hasMore) {
      setOffset((prev) => prev + PAGE_SIZE)
    }
  }, [hasMore])

  const handleClearFilters = useCallback(() => {
    setStartDate('')
    setEndDate('')
    setServiceType('all')
    handleFilterChange()
  }, [handleFilterChange])

  const hasFilters = startDate || endDate || serviceType !== 'all'

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{t('credits.title')}</h1>
        <p className="text-muted-foreground">
          {t('credits.description')}
        </p>
      </div>

      {/* Filters */}
      <div className="bg-card border rounded-lg p-4 mb-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              {t('credits.startDate')}
            </label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              placeholder="YYYY-MM-DD"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">
              {t('credits.endDate')}
            </label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => handleEndDateChange(e.target.value)}
              placeholder="YYYY-MM-DD"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">
              {t('credits.serviceType')}
            </label>
            <Select value={serviceType} onValueChange={handleServiceTypeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SERVICE_TYPES.map((st) => (
                  <SelectItem key={st.value} value={st.value}>
                    {t(st.translationKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            {hasFilters && (
              <Button variant="outline" onClick={handleClearFilters} className="w-full">
                <Icon icon="lucide:x" className="mr-2 h-4 w-4" />
                {t('credits.clearFilters')}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="border rounded-lg">
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg">
          <div className="rounded-full bg-destructive/10 p-4 mb-4">
            <Icon icon="lucide:alert-circle" className="w-8 h-8 text-destructive" />
          </div>
          <h3 className="text-lg font-medium mb-2">
            {t('credits.error')}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mb-4">
            {error instanceof Error ? error.message : t('credits.errorDescription')}
          </p>
          <Button onClick={() => refetch()}>
            <Icon icon="lucide:refresh-cw" className="mr-2 h-4 w-4" />
            {t('credits.retry')}
          </Button>
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Icon icon="lucide:inbox" className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">
            {t('credits.noRecords')}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md">
            {hasFilters
              ? t('credits.noRecordsWithFilters')
              : t('credits.noRecordsDescription')}
          </p>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="border rounded-lg overflow-hidden mb-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('credits.table.date')}</TableHead>
                  <TableHead>{t('credits.table.time')}</TableHead>
                  <TableHead>{t('credits.table.service')}</TableHead>
                  <TableHead>{t('credits.table.tier')}</TableHead>
                  <TableHead className="text-right">
                    {t('credits.table.required')}
                  </TableHead>
                  <TableHead className="text-right">
                    {t('credits.table.usedAfter')}
                  </TableHead>
                  <TableHead>{t('credits.table.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{formatDate(log.date)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatTimestamp(log.timestamp)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {t(`credits.serviceTypes.${log.serviceType}`, { defaultValue: log.serviceType })}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{log.tier}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{log.required}</TableCell>
                    <TableCell className="text-right">{log.usedAfter}</TableCell>
                    <TableCell>
                      {log.allowed ? (
                        <Badge variant="default" className="bg-green-600">
                          {t('credits.allowed')}
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          {t('credits.denied')}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {t('credits.pageInfo', { page: currentPage })}
              {!hasMore && logs.length > 0 && (
                <span className="ml-2">
                  ({t('credits.totalRecords', { count: offset + logs.length })})
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handlePreviousPage}
                disabled={offset === 0}
              >
                <Icon icon="lucide:chevron-left" className="mr-2 h-4 w-4" />
                {t('credits.previous')}
              </Button>
              <Button
                variant="outline"
                onClick={handleNextPage}
                disabled={!hasMore}
              >
                {t('credits.next')}
                <Icon icon="lucide:chevron-right" className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
