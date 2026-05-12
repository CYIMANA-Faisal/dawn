'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  Briefcase,
  CalendarClock,
  Hash,
  Plus,
  UserCircle2,
} from 'lucide-react'
import { LogoutButton } from '@/components/client/interactive/LogoutButton'
import { Protected } from '@/components/client/interactive/Protected'
import { Button } from '@/components/ui/button'
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
import { ProjectStatusBadge } from '@/features/projects/components/ProjectStatusBadge'
import {
  useCreateProjectMutation,
  useGetProjectsQuery,
} from '@/features/projects/projectsApi'

export default function ProjectsPage() {
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [projectNameError, setProjectNameError] = useState<string | null>(null)

  const {
    data: projects = [],
    isLoading,
    isError,
    refetch,
  } = useGetProjectsQuery()
  const [createProject, { isLoading: isCreating, isError: isCreateError }] =
    useCreateProjectMutation()

  const handleCreateProject = async () => {
    const trimmedName = projectName.trim()

    if (trimmedName.length < 2) {
      setProjectNameError('Project name must be at least 2 characters.')
      return
    }

    if (trimmedName.length > 150) {
      setProjectNameError('Project name must not exceed 150 characters.')
      return
    }

    setProjectNameError(null)

    try {
      await createProject({ name: trimmedName }).unwrap()
      setProjectName('')
      setCreateModalOpen(false)
    } catch {
      // Error is surfaced by isCreateError.
    }
  }

  const formatCreatedAt = (createdAt: string) => {
    return new Date(createdAt).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <Protected>
      <main className="mx-auto w-full max-w-6xl space-y-8 p-6 font-sans">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Projects</h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage your liquidation projects with a clean card-first workflow.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <LogoutButton />
            <Button
              onClick={() => {
                setCreateModalOpen(true)
                setProjectNameError(null)
              }}
            >
              <Plus className="h-4 w-4" />
              Create Project
            </Button>
          </div>
        </header>

        {isLoading && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Card key={index} className="border-slate-200/80 bg-white">
                <CardHeader className="space-y-3 pb-2">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {isError && (
          <Card className="border-red-200 bg-red-50/80">
            <CardContent className="space-y-3 p-5">
              <p className="text-sm text-red-700">Failed to load projects.</p>
              <Button type="button" variant="outline" onClick={() => refetch()}>
                Try again
              </Button>
            </CardContent>
          </Card>
        )}

        {!isLoading && !isError && projects.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-20 text-center">
            <Briefcase className="mb-4 h-12 w-12 text-slate-300" />
            <p className="text-lg font-medium text-slate-600">No projects yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Create your first project to get started.
            </p>
            <Button
              className="mt-6"
              onClick={() => {
                setCreateModalOpen(true)
                setProjectNameError(null)
              }}
            >
              <Plus className="h-4 w-4" />
              Create Project
            </Button>
          </div>
        )}

        {!isLoading && !isError && projects.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`} className="group block">
                <Card className="h-full border-slate-200/80 bg-white transition-shadow group-hover:shadow-md">
                  <CardHeader className="space-y-1 pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="line-clamp-2 text-base text-slate-900">
                        {project.name}
                      </CardTitle>
                      <ProjectStatusBadge status={project.status} />
                    </div>
                    <p className="flex items-center gap-1.5 text-xs text-slate-500">
                      <UserCircle2 className="h-3.5 w-3.5" />
                      {project.createdByName || project.createdByUserId}
                    </p>
                  </CardHeader>

                  <CardContent className="pt-0">
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <Hash className="h-3.5 w-3.5" />
                        {project.identifier}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <CalendarClock className="h-3.5 w-3.5" />
                        {formatCreatedAt(project.createdAt)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Enter a project name to start managing shareholders.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 pt-2">
              <label htmlFor="project-name" className="text-sm font-medium text-slate-800">
                Project Name
              </label>
              <Input
                id="project-name"
                placeholder="e.g. ABC Corp Liquidation"
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                maxLength={150}
                autoFocus
              />
              {projectNameError && <p className="text-xs text-red-600">{projectNameError}</p>}
              {isCreateError && (
                <p className="text-xs text-red-600">
                  Failed to create project. Please try again.
                </p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleCreateProject}
                disabled={isCreating}
              >
                {isCreating ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </Protected>
  )
}
