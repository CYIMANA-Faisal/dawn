'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useParams } from 'next/navigation'
import { LogoutButton } from '@/components/client/interactive/LogoutButton'
import { Protected } from '@/components/client/interactive/Protected'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useGetFormByIdQuery } from '@/features/forms/formsApi'

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

function hashString(value: string): number {
  let hash = 0

  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) | 0
  }

  return Math.abs(hash)
}

function buildPercentageDistribution(seed: string, count: number): number[] {
  const weights = Array.from({ length: count }, (_unused, index) => {
    return (hashString(`${seed}:${index}`) % 100) + 1
  })

  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
  const exactPercentages = weights.map((weight) => (weight / totalWeight) * 100)
  const roundedDownPercentages = exactPercentages.map((percentage) => Math.floor(percentage))
  const currentTotal = roundedDownPercentages.reduce((sum, percentage) => sum + percentage, 0)
  const remainder = 100 - currentTotal

  if (remainder > 0) {
    const fractionalRanks = exactPercentages
      .map((percentage, index) => ({
        index,
        fractional: percentage - Math.floor(percentage),
      }))
      .sort((left, right) => right.fractional - left.fractional)

    for (let i = 0; i < remainder; i += 1) {
      const rank = fractionalRanks[i % fractionalRanks.length]
      roundedDownPercentages[rank.index] += 1
    }
  }

  return roundedDownPercentages
}

function buildDummyStats(projectId: string, formId: string): StatBlock[] {
  const blocks: Array<{ title: string; segments: StatSegmentConfig[] }> = [
    {
      title: 'Appointment of 1st preference proxy',
      segments: [
        { label: 'Chair', tone: 'green' },
        { label: 'Other', tone: 'amber' },
        { label: 'Not responded', tone: 'grey' },
      ],
    },
    {
      title: 'Resolution 1',
      segments: [
        { label: 'Agree', tone: 'green' },
        { label: 'Disagree', tone: 'red' },
        { label: 'Proxyholders discretion', tone: 'amber' },
        { label: 'Not responded', tone: 'grey' },
      ],
    },
    {
      title: 'Resolution 2',
      segments: [
        { label: 'Default response', tone: 'green' },
        { label: 'Other', tone: 'red' },
        { label: 'Not responded', tone: 'grey' },
      ],
    },
    {
      title: 'Resolution 3',
      segments: [
        { label: 'Agree', tone: 'green' },
        { label: 'Disagree', tone: 'red' },
        { label: 'Proxyholders discretion', tone: 'amber' },
        { label: 'Not responded', tone: 'grey' },
      ],
    },
    {
      title: 'Liquidation committee',
      segments: [
        { label: 'No input', tone: 'green' },
        { label: 'Input', tone: 'red' },
        { label: 'Not responded', tone: 'grey' },
      ],
    },
  ]

  return blocks.map((block) => {
    const percentages = buildPercentageDistribution(
      `${projectId}:${formId}:${block.title}`,
      block.segments.length,
    )

    return {
      title: block.title,
      segments: block.segments.map((segment, index) => ({
        ...segment,
        percentage: percentages[index] ?? 0,
      })),
    }
  })
}

export default function FormStatisticsPage() {
  const params = useParams<{ id: string; formId: string }>()
  const projectId = params.id
  const formId = params.formId

  const { data: formSchema, isLoading } = useGetFormByIdQuery(formId, { skip: !formId })

  const statsBlocks = useMemo(() => buildDummyStats(projectId, formId), [projectId, formId])

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
              {isLoading ? 'Loading form details...' : formSchema?.title || 'Form'}
            </p>
            <p className="text-xs text-slate-500">
              These values are currently dummy percentages until statistics API integration is
              available.
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {statsBlocks.map((block) => (
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
                          <span className={`h-2.5 w-2.5 rounded-full ${toneStyles.bulletClassName}`} />
                          <span className={`text-sm ${toneStyles.textClassName}`}>{segment.label}</span>
                        </div>
                        <span className="text-sm font-semibold text-slate-800">{segment.percentage}%</span>
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
