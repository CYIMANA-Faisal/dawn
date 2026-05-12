'use client'

import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ArrowLeft,
  BarChart3,
  Hash,
  Mail,
  PieChart,
  Plus,
  Send,
  ShieldCheck,
  Upload,
  UserPlus,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { LogoutButton } from '@/components/client/interactive/LogoutButton'
import { Protected } from '@/components/client/interactive/Protected'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ArchiveProjectButton } from '@/features/projects/components/ArchiveProjectButton'
import { ProjectForm } from '@/features/projects/components/ProjectForm'
import { ProjectStatusBadge } from '@/features/projects/components/ProjectStatusBadge'
import {
  useDistributeFormMutation,
  useGetFormByIdQuery,
  useGetFormsDropdownQuery,
} from '@/features/forms/formsApi'
import {
  useCreateShareholderMutation,
  useGetShareholdersQuery,
  useUploadShareholdersMutation,
} from '@/features/projects/shareholdersApi'
import type { Shareholder } from '@/features/projects/shareholdersTypes'
import {
  useGetProjectByIdQuery,
  useUpdateProjectMutation,
} from '@/features/projects/projectsApi'

const PAGE_SIZE = 20
const EMPTY_SHAREHOLDERS: Shareholder[] = []
type FormDeliveryStatus = 'NOT_SENT' | 'SENT' | 'COMPLETED'

const FORM_STATUS_CONFIG: Record<
  FormDeliveryStatus,
  { label: string; badgeVariant: 'muted' | 'outline' | 'success' }
> = {
  NOT_SENT: { label: 'Not sent', badgeVariant: 'muted' },
  SENT: { label: 'Sent', badgeVariant: 'outline' },
  COMPLETED: { label: 'Completed', badgeVariant: 'success' },
}

function formatCreatedAt(createdAt: string) {
  return new Date(createdAt).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function buildFrontendUrlTemplate(args: {
  origin: string
  meetingDate: string
  proposedLiquidatorsNames: string
  proposedLiquidatorsFirmAddress: string
}) {
  const normalizedOrigin = args.origin.replace(/\/+$/, '')
  const encodedMeetingDate = encodeURIComponent(args.meetingDate)
  const encodedLiquidatorsNames = encodeURIComponent(args.proposedLiquidatorsNames)
  const encodedLiquidatorsFirmAddress = encodeURIComponent(
    args.proposedLiquidatorsFirmAddress,
  )

  return `${normalizedOrigin}/projects/{projectId}/forms/{formId}?shareholderId={shareholderId}&meetingDate=${encodedMeetingDate}&proposedLiquidatorsNames=${encodedLiquidatorsNames}&proposedLiquidatorsFirmAddress=${encodedLiquidatorsFirmAddress}`
}

function getShareholderFormStatusPresentation(
  shareholder: Shareholder,
  formId: string,
): { label: string; badgeVariant: 'muted' | 'outline' | 'success' } {
  const formSentEntry = shareholder.formsSent?.find((entry) => entry.formId === formId)
  const statusLabel = formSentEntry?.status?.trim()

  if (!statusLabel) {
    return FORM_STATUS_CONFIG.NOT_SENT
  }

  const normalizedStatus = statusLabel.toLowerCase()

  if (normalizedStatus === 'sent') {
    return FORM_STATUS_CONFIG.SENT
  }

  if (normalizedStatus === 'completed' || normalizedStatus === 'complete') {
    return FORM_STATUS_CONFIG.COMPLETED
  }

  if (
    normalizedStatus === 'not sent' ||
    normalizedStatus === 'not_sent' ||
    normalizedStatus === 'notsent'
  ) {
    return FORM_STATUS_CONFIG.NOT_SENT
  }

  return {
    label: statusLabel,
    badgeVariant: 'outline',
  }
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon
  label: string
  value: number | string
}) {
  return (
    <Card className="border-slate-200/80 bg-white">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
          <Icon className="h-5 w-5 text-slate-700" />
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          <p className="text-xs text-slate-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function ProjectDetailsPage() {
  const params = useParams<{ id: string }>()
  const projectId = params.id

  const {
    data: project,
    isLoading,
    isError,
    refetch,
  } = useGetProjectByIdQuery(projectId, { skip: !projectId })

  const [updateProject, { isLoading: isUpdating, isError: isUpdateError }] =
    useUpdateProjectMutation()

  const [page, setPage] = useState(0)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [sendDialogOpen, setSendDialogOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newShares, setNewShares] = useState('')
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [selectedFormId, setSelectedFormId] = useState('')
  const [meetingDate, setMeetingDate] = useState('')
  const [proposedLiquidatorsNames, setProposedLiquidatorsNames] = useState('')
  const [proposedLiquidatorsFirmAddress, setProposedLiquidatorsFirmAddress] = useState('')
  const [distributeError, setDistributeError] = useState<string | null>(null)
  const [distributeSuccess, setDistributeSuccess] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    data: shareholdersPage,
    isLoading: isShareholdersLoading,
    isError: isShareholdersError,
    refetch: refetchShareholders,
  } = useGetShareholdersQuery(
    {
      projectId,
      page,
      size: PAGE_SIZE,
    },
    { skip: !projectId },
  )

  const [uploadShareholders, { isLoading: isUploading }] =
    useUploadShareholdersMutation()
  const [createShareholder, { isLoading: isCreatingShareholder }] =
    useCreateShareholderMutation()
  const [distributeForm, { isLoading: isDistributingForm }] =
    useDistributeFormMutation()

  const {
    data: formsDropdown = [],
    isLoading: isFormsDropdownLoading,
    isError: isFormsDropdownError,
  } = useGetFormsDropdownQuery()

  const {
    data: selectedFormSchema,
    isLoading: isSelectedFormLoading,
  } = useGetFormByIdQuery(selectedFormId, { skip: !selectedFormId })

  const selectedFormFieldCount = useMemo(() => {
    if (!selectedFormSchema) return 0

    if (Array.isArray(selectedFormSchema.sections)) {
      return selectedFormSchema.sections.reduce((total, section) => {
        return total + (Array.isArray(section.questions) ? section.questions.length : 0)
      }, 0)
    }

    return Array.isArray(selectedFormSchema.fields) ? selectedFormSchema.fields.length : 0
  }, [selectedFormSchema])

  const trimmedMeetingDate = meetingDate.trim()
  const trimmedProposedLiquidatorsNames = proposedLiquidatorsNames.trim()
  const trimmedProposedLiquidatorsFirmAddress = proposedLiquidatorsFirmAddress.trim()
  const isDistributeContextValid =
    trimmedMeetingDate.length > 0 &&
    trimmedProposedLiquidatorsNames.length > 0 &&
    trimmedProposedLiquidatorsFirmAddress.length > 0

  const shareholders = shareholdersPage?.content || EMPTY_SHAREHOLDERS
  const totalShareholders = shareholdersPage?.totalElements ?? 0
  const totalPages = shareholdersPage?.totalPages ?? 0
  const currentPage = (shareholdersPage?.number ?? 0) + 1
  const hasPreviousPage = !shareholdersPage?.first
  const hasNextPage = !shareholdersPage?.last
  const parsedShares = Number.parseInt(newShares, 10)
  const isCreateShareholderFormValid =
    newName.trim().length > 0 && Number.isFinite(parsedShares) && parsedShares >= 1

  const sharesOnCurrentPage = useMemo(() => {
    return shareholders.reduce((sum, shareholder) => sum + shareholder.numberOfShares, 0)
  }, [shareholders])

  const shareholdersWithEmail = useMemo(() => {
    return shareholders.filter((shareholder) => Boolean(shareholder.email?.trim())).length
  }, [shareholders])

  const createdBy = project?.createdByName || project?.createdByUserId || 'Unknown'
  const isArchived = project?.status === 'ARCHIVED'

  const handleUpdate = async (values: { name: string }) => {
    if (!project) return

    await updateProject({
      id: project.id,
      body: values,
    }).unwrap()
  }

  const performUpload = async (file: File) => {
    try {
      await uploadShareholders({ projectId, file }).unwrap()
      setUploadError(null)
      setPage(0)
      return true
    } catch {
      setUploadError('Upload failed. Please confirm the file format and try again.')
      return false
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const hasValidExtension = /\.(xlsx|xls)$/i.test(file.name)
    if (!hasValidExtension) {
      setUploadError('Please upload an Excel file (.xlsx or .xls).')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    await performUpload(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleCreateSingleShareholder = async () => {
    const trimmedName = newName.trim()
    const trimmedEmail = newEmail.trim()
    const shares = parsedShares

    if (!trimmedName) {
      setUploadError('Shareholder name is required.')
      return
    }

    if (!Number.isFinite(shares) || shares <= 0) {
      setUploadError('Number of shares must be greater than 0.')
      return
    }

    try {
      await createShareholder({
        projectId,
        body: {
          name: trimmedName,
          email: trimmedEmail || undefined,
          numberOfShares: shares,
        },
      }).unwrap()

      setUploadError(null)
      setPage(0)
      setNewName('')
      setNewEmail('')
      setNewShares('')
      setAddDialogOpen(false)
    } catch {
      setUploadError('Failed to create shareholder. Please try again.')
    }
  }

  const handleDistributeForm = async () => {
    if (!selectedFormId) {
      setDistributeError('Please select a form before sending.')
      return
    }

    if (!trimmedMeetingDate) {
      setDistributeError('Meeting date is required.')
      return
    }

    if (!trimmedProposedLiquidatorsNames) {
      setDistributeError('Proposed liquidators names are required.')
      return
    }

    if (!trimmedProposedLiquidatorsFirmAddress) {
      setDistributeError('Proposed liquidators firm address is required.')
      return
    }

    const origin =
      typeof window === 'undefined' ? 'https://app.yourdomain.com' : window.location.origin
    const frontendUrlTemplate = buildFrontendUrlTemplate({
      origin,
      meetingDate: trimmedMeetingDate,
      proposedLiquidatorsNames: trimmedProposedLiquidatorsNames,
      proposedLiquidatorsFirmAddress: trimmedProposedLiquidatorsFirmAddress,
    })

    try {
      const response = await distributeForm({
        projectId,
        formId: selectedFormId,
        body: {
          frontendUrlTemplate,
        },
      }).unwrap()

      setDistributeError(null)
      setDistributeSuccess(response.message || 'Form distribution started successfully.')
    } catch {
      setDistributeSuccess(null)
      setDistributeError('Failed to start form distribution. Please try again.')
    }
  }

  return (
    <Protected>
      <main className="mx-auto w-full max-w-6xl space-y-6 p-6 font-sans">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            asChild
            variant="ghost"
            className="w-fit rounded-md px-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            <Link href="/projects">
              <ArrowLeft className="h-4 w-4" />
              Back to Projects
            </Link>
          </Button>

          <LogoutButton />
        </div>

        {isLoading && (
          <div className="space-y-2 rounded-xl border border-slate-200/80 bg-white p-5">
            <div className="h-6 w-60 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
          </div>
        )}

        {isError && (
          <Card className="border-red-200 bg-red-50/80">
            <CardContent className="space-y-3 p-5">
              <p className="text-sm text-red-700">Failed to load project.</p>
              <Button type="button" variant="outline" onClick={() => refetch()}>
                Try again
              </Button>
            </CardContent>
          </Card>
        )}

        {project && (
          <>
            <Card className="border-slate-200/80 bg-white">
              <CardContent className="flex flex-wrap items-start justify-between gap-4 p-5">
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-slate-900">{project.name}</h1>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                    <Hash className="h-3.5 w-3.5" />
                    {project.identifier}
                  </p>
                </div>
                <ProjectStatusBadge status={project.status} />
              </CardContent>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard icon={Users} label="Total Shareholders" value={totalShareholders} />
              <StatCard icon={PieChart} label="Total Shares %" value={sharesOnCurrentPage} />
              <StatCard icon={Mail} label="With Email (Page)" value={shareholdersWithEmail} />
              <StatCard
                icon={ShieldCheck}
                label="Current Page"
                value={totalPages > 0 ? `${currentPage}/${totalPages}` : '0/0'}
              />
            </div>

            <Card className="border-slate-200/80 bg-white">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle className="text-base font-semibold text-slate-900">
                    Shareholders
                  </CardTitle>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                      className="hidden"
                      onChange={(event) => void handleFileUpload(event)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isArchived || isUploading}
                    >
                      <Upload className="h-4 w-4" />
                      {isUploading ? 'Uploading...' : 'Upload Shareholders'}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setAddDialogOpen(true)}
                      disabled={isArchived || isUploading}
                    >
                      <UserPlus className="h-4 w-4" />
                      Add Shareholder
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setDistributeError(null)
                        setDistributeSuccess(null)
                        setSendDialogOpen(true)
                      }}
                      disabled={isArchived || totalShareholders === 0}
                    >
                      <Send className="h-4 w-4" />
                      Send Form
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                {uploadError && <p className="mb-3 text-sm text-red-600">{uploadError}</p>}

                {isShareholdersError && (
                  <Card className="mb-4 border-red-200 bg-red-50/80">
                    <CardContent className="space-y-3 p-4">
                      <p className="text-sm text-red-700">Failed to load shareholders.</p>
                      <Button type="button" variant="outline" onClick={() => refetchShareholders()}>
                        Retry
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {isShareholdersLoading ? (
                  <p className="text-sm text-slate-500">Loading shareholders...</p>
                ) : shareholders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 py-14 text-center">
                    <Users className="mb-3 h-10 w-10 text-slate-300" />
                    <p className="font-medium text-slate-600">No shareholders yet</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Upload an Excel file or add a shareholder manually.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="rounded-xl border border-slate-200">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Total Shares (%)</TableHead>
                            {formsDropdown.map((form) => (
                              <TableHead key={form.id}>
                                <div className="flex min-w-[200px] items-center justify-between gap-2">
                                  <span className="truncate">{form.title}</span>
                                  <Button asChild type="button" size="sm" variant="outline" className="h-7 px-2">
                                    <Link href={`/projects/${projectId}/forms/${form.id}/stats`}>
                                      <BarChart3 className="h-3.5 w-3.5" />
                                      View stats
                                    </Link>
                                  </Button>
                                </div>
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {shareholders.map((shareholder) => (
                            <TableRow key={shareholder.id}>
                              <TableCell className="font-medium text-slate-900">
                                {shareholder.name}
                              </TableCell>
                              <TableCell className="text-slate-700">
                                {shareholder.email || '—'}
                              </TableCell>
                              <TableCell className="text-slate-700">
                                {shareholder.numberOfShares}%
                              </TableCell>
                              {formsDropdown.map((form) => {
                                const statusConfig = getShareholderFormStatusPresentation(
                                  shareholder,
                                  form.id,
                                )

                                return (
                                  <TableCell key={`${shareholder.id}-${form.id}`} className="text-slate-700">
                                    <Badge variant={statusConfig.badgeVariant}>
                                      {statusConfig.label}
                                    </Badge>
                                  </TableCell>
                                )
                              })}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {totalPages > 1 && (
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-slate-500">
                          Showing page {currentPage} of {totalPages} ({totalShareholders} total)
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((value) => value - 1)}
                            disabled={!hasPreviousPage}
                          >
                            Previous
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((value) => value + 1)}
                            disabled={!hasNextPage}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-5">
              <Card className="border-slate-200/80 bg-white lg:col-span-3">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-slate-900">
                    Project Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <dl className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-slate-500">Name</dt>
                      <dd className="mt-1 text-sm font-medium text-slate-800">{project.name}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-slate-500">Identifier</dt>
                      <dd className="mt-1 text-sm font-medium text-slate-800">
                        {project.identifier}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-slate-500">Created By</dt>
                      <dd className="mt-1 text-sm font-medium text-slate-800">{createdBy}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-slate-500">Created At</dt>
                      <dd className="mt-1 text-sm font-medium text-slate-800">
                        {formatCreatedAt(project.createdAt)}
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>

              <Card className="border-slate-200/80 bg-white lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-slate-900">
                    Edit Project
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {project.status === 'ARCHIVED' ? (
                    <p className="text-sm text-slate-600">
                      This project is archived. Reactivate it from backend tools before editing.
                    </p>
                  ) : (
                    <>
                      {isUpdateError && (
                        <Card className="border-red-200 bg-red-50/80">
                          <CardContent className="p-3">
                            <p className="text-sm text-red-700">Failed to update project.</p>
                          </CardContent>
                        </Card>
                      )}

                      <ProjectForm
                        key={project.id + project.name}
                        initialName={project.name}
                        submitLabel="Save Changes"
                        isSubmitting={isUpdating}
                        onSubmit={handleUpdate}
                      />

                      <div className="border-t border-slate-200 pt-4">
                        <ArchiveProjectButton projectId={project.id} />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Shareholder</DialogTitle>
                  <DialogDescription>
                    Enter the exact API fields. `Name` and `Number of Shares` are required.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-2">
                  <div className="grid gap-2">
                    <label htmlFor="shareholder-name" className="text-sm font-medium text-slate-800">
                      Name *
                    </label>
                    <Input
                      id="shareholder-name"
                      value={newName}
                      onChange={(event) => setNewName(event.target.value)}
                      placeholder="John Doe"
                    />
                  </div>

                  <div className="grid gap-2">
                    <label htmlFor="shareholder-email" className="text-sm font-medium text-slate-800">
                      Email (Optional)
                    </label>
                    <Input
                      id="shareholder-email"
                      type="email"
                      value={newEmail}
                      onChange={(event) => setNewEmail(event.target.value)}
                      placeholder="john@example.com"
                    />
                  </div>

                  <div className="grid gap-2">
                    <label htmlFor="shareholder-shares" className="text-sm font-medium text-slate-800">
                      Number of Shares *
                    </label>
                    <Input
                      id="shareholder-shares"
                      type="number"
                      min={1}
                      value={newShares}
                      onChange={(event) => setNewShares(event.target.value)}
                      placeholder="1000"
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void handleCreateSingleShareholder()}
                    disabled={!isCreateShareholderFormValid || isUploading || isCreatingShareholder}
                  >
                    <Plus className="h-4 w-4" />
                    {isCreatingShareholder ? 'Saving...' : 'Save Shareholder'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Distribute Form via Email</DialogTitle>
                  <DialogDescription>
                    Select a form and provide the required meeting and liquidator details.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-2">
                  <div className="grid gap-2">
                    <label htmlFor="form-id" className="text-sm font-medium text-slate-800">
                      Form *
                    </label>
                    <select
                      id="form-id"
                      value={selectedFormId}
                      onChange={(event) => setSelectedFormId(event.target.value)}
                      disabled={isFormsDropdownLoading}
                      className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-slate-300 disabled:opacity-50"
                    >
                      <option value="">
                        {isFormsDropdownLoading ? 'Loading forms...' : 'Select a form'}
                      </option>
                      {formsDropdown.map((form) => (
                        <option key={form.id} value={form.id}>
                          {form.title}
                        </option>
                      ))}
                    </select>
                    {isFormsDropdownError && (
                      <p className="text-xs text-red-600">Failed to load forms dropdown.</p>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <label htmlFor="meeting-date" className="text-sm font-medium text-slate-800">
                      Meeting Date *
                    </label>
                    <Input
                      id="meeting-date"
                      type="date"
                      value={meetingDate}
                      onChange={(event) => setMeetingDate(event.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <label
                      htmlFor="proposed-liquidators-names"
                      className="text-sm font-medium text-slate-800"
                    >
                      Proposed Liquidators Names *
                    </label>
                    <Input
                      id="proposed-liquidators-names"
                      value={proposedLiquidatorsNames}
                      onChange={(event) => setProposedLiquidatorsNames(event.target.value)}
                      placeholder="Jane Doe, John Smith"
                    />
                  </div>

                  <div className="grid gap-2">
                    <label
                      htmlFor="proposed-liquidators-firm-address"
                      className="text-sm font-medium text-slate-800"
                    >
                      Proposed Liquidators Firm Address *
                    </label>
                    <Input
                      id="proposed-liquidators-firm-address"
                      value={proposedLiquidatorsFirmAddress}
                      onChange={(event) =>
                        setProposedLiquidatorsFirmAddress(event.target.value)
                      }
                      placeholder="123 Main St, Kigali, Rwanda"
                    />
                  </div>

                  {selectedFormId && (
                    <Card className="border-slate-200 bg-slate-50">
                      <CardContent className="space-y-1 p-3">
                        {isSelectedFormLoading ? (
                          <p className="text-sm text-slate-500">Loading form details...</p>
                        ) : selectedFormSchema ? (
                          <>
                            <p className="text-sm font-medium text-slate-800">
                              {selectedFormSchema.title}
                            </p>
                            {selectedFormSchema.subtitle && (
                              <p className="text-xs text-slate-600">{selectedFormSchema.subtitle}</p>
                            )}
                            <p className="text-xs text-slate-500">
                              Fields: {selectedFormFieldCount}
                            </p>
                          </>
                        ) : (
                          <p className="text-sm text-slate-500">Form details unavailable.</p>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {distributeError && <p className="text-xs text-red-600">{distributeError}</p>}
                  {distributeSuccess && (
                    <p className="text-xs text-green-700">{distributeSuccess}</p>
                  )}
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setSendDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void handleDistributeForm()}
                    disabled={isDistributingForm || !selectedFormId || !isDistributeContextValid}
                  >
                    <Send className="h-4 w-4" />
                    {isDistributingForm ? 'Sending...' : 'Start Distribution'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </main>
    </Protected>
  )
}
