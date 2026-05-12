'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useArchiveProjectMutation } from '../projectsApi'

type Props = {
  projectId: string
  disabled?: boolean
}

export function ArchiveProjectButton({ projectId, disabled }: Props) {
  const [archiveProject, { isLoading }] = useArchiveProjectMutation()
  const [error, setError] = useState<string | null>(null)

  const handleArchive = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to archive this project? It will not be deleted.',
    )

    if (!confirmed) return

    setError(null)

    try {
      await archiveProject(projectId).unwrap()
    } catch {
      setError('Failed to archive project.')
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        variant="outline"
        size="xs"
        onClick={handleArchive}
        disabled={disabled || isLoading}
      >
        {isLoading ? 'Archiving...' : 'Archive'}
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
