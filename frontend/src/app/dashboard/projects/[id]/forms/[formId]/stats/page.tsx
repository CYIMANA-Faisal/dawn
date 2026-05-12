'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useParams } from 'next/navigation'
import { LogoutButton } from '@/components/client/interactive/LogoutButton'
import { Protected } from '@/components/client/interactive/Protected'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useGetFormByIdQuery, useGetFormStatisticsQuery } from '@/features/forms/formsApi'
import type { FormStatisticsSegment } from '@/features/forms/formsTypes'

type SegmentTone = 'green' | 'red' | 'amber' | 'grey'

type StatSegmentConfig = {
  label: string
  tone: SegmentTone
}

type StatSegment = StatSegmentConfig & {
  percentage: number
}

type StatBlock = {
  title: string
  segments: StatSegment[]
}

const SEGMENT_TONE_STYLES: Record<
  SegmentTone,
  {
    barClassName: string
    bulletClassName: string
    textClassName: string
  }
> = {
  green: {
    barClassName: 'bg-emerald-500',
    bulletClassName: 'bg-emerald-500',
    textClassName: 'text-emerald-700',
  },
  red: {
    barClassName: 'bg-rose-500',
    bulletClassName: 'bg-rose-500',
    textClassName: 'text-rose-700',
  },
  amber: {
    barClassName: 'bg-amber-500',
    bulletClassName: 'bg-amber-500',
    textClassName: 'text-amber-700',
  },
  grey: {
    barClassName: 'bg-slate-400',
    bulletClassName: 'bg-slate-400',
    textClassName: 'text-slate-600',
  },
}

function normalizeTone(tone: FormStatisticsSegment['tone']): SegmentTone {
  const normalizedTone = tone?.toString().trim().toLowerCase()

  if (normalizedTone === 'green' || normalizedTone === 'red' || normalizedTone === 'amber') {
    return normalizedTone
  }

  return 'grey'
}

function normalizePercentage(percentage: unknown): number {
  if (typeof percentage !== 'number' || !Number.isFinite(percentage)) {
    return 0
  }

  return Math.max(0, Math.min(100, percentage))
}

function formatPercentage(percentage: number): string {
  return percentage.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')
}

export default function FormStatisticsPage() {
  const params = useParams<{ id: string; formId: string }>()
  const projectId = params.id
  const formId = params.formId

  const { data: formSchema, isLoading: isFormLoading } = useGetFormByIdQuery(formId, {
    skip: !formId,
  })

  const {
    data: statisticsResponse,
    isLoading: isStatisticsLoading,
    isError: isStatisticsError,
    refetch: refetchStatistics,
  } = useGetFormStatisticsQuery(
    {
      projectId,
      formId,
      basis: 'headcount',
    },
    { skip: !projectId || !formId },
  )

  const statsBlocks = useMemo<StatBlock[]>(() => {
    const apiBlocks = statisticsResponse?.blocks
    if (!Array.isArray(apiBlocks)) return []

    return apiBlocks
      .filter((block): block is { title: string; segments: FormStatisticsSegment[] } => {
        return Boolean(block?.title?.trim()) && Array.isArray(block.segments)
      })
      .map((block) => ({
        title: block.title.trim(),
        segments: block.segments
          .filter((segment): segment is FormStatisticsSegment => Boolean(segment?.label?.trim()))
          .map((segment) => ({
            label: segment.label.trim(),
            tone: normalizeTone(segment.tone),
            percentage: normalizePercentage(segment.percentage),
          })),
      }))
      .filter((block) => block.segments.length > 0)
  }, [statisticsResponse])

  const basisLabel =
    statisticsResponse?.basis?.toString().toLowerCase() === 'shares' ? 'Shares' : 'Headcount'

  return (
    <Protected>
      <main className="mx-auto w-full max-w-5xl space-y-6 p-6 font-sans">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            asChild
            variant="ghost"
            className="w-fit rounded-md px-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            <Link href={`/projects/${projectId}`}>
              <ArrowLeft className="h-4 w-4" />
              Back to Project
            </Link>
          </Button>

          <LogoutButton />
        </div>

        <Card className="border-slate-200/80 bg-white">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-slate-900">
              Form Statistics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-slate-700">
              {isFormLoading ? 'Loading form details...' : formSchema?.title || 'Form'}
            </p>
            <p className="text-xs text-slate-500">Basis: {basisLabel}</p>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {isStatisticsLoading && (
            <Card className="border-slate-200/80 bg-white">
              <CardContent className="p-5">
                <p className="text-sm text-slate-600">Loading statistics...</p>
              </CardContent>
            </Card>
          )}

          {!isStatisticsLoading && isStatisticsError && (
            <Card className="border-red-200 bg-red-50/80">
              <CardContent className="space-y-3 p-5">
                <p className="text-sm text-red-700">Failed to load form statistics.</p>
                <Button type="button" variant="outline" onClick={() => refetchStatistics()}>
                  Try again
                </Button>
              </CardContent>
            </Card>
          )}

          {!isStatisticsLoading && !isStatisticsError && statsBlocks.length === 0 && (
            <Card className="border-slate-200/80 bg-white">
              <CardContent className="p-5">
                <p className="text-sm text-slate-600">
                  No statistics are available for this form yet.
                </p>
              </CardContent>
            </Card>
          )}

          {!isStatisticsLoading &&
            !isStatisticsError &&
            statsBlocks.map((block) => (
              <Card key={block.title} className="border-slate-200/80 bg-white">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold text-slate-900">{block.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="h-3 w-full overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                    <div className="flex h-full w-full">
                      {block.segments.map((segment) => {
                        const toneStyles = SEGMENT_TONE_STYLES[segment.tone]
                        return (
                          <div
                            key={segment.label}
                            className={toneStyles.barClassName}
                            style={{ width: `${segment.percentage}%` }}
                          />
                        )
                      })}
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {block.segments.map((segment) => {
                      const toneStyles = SEGMENT_TONE_STYLES[segment.tone]

                      return (
                        <div
                          key={`${block.title}:${segment.label}`}
                          className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`h-2.5 w-2.5 rounded-full ${toneStyles.bulletClassName}`}
                            />
                            <span className={`text-sm ${toneStyles.textClassName}`}>
                              {segment.label}
                            </span>
                          </div>
                          <span className="text-sm font-semibold text-slate-800">
                            {formatPercentage(segment.percentage)}%
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      </main>
    </Protected>
  )
}
