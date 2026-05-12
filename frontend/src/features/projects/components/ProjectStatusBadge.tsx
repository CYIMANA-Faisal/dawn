import type { ProjectStatus } from '../types'
import { Badge } from '@/components/ui/badge'

type Props = {
  status: ProjectStatus
}

export function ProjectStatusBadge({ status }: Props) {
  return (
    <Badge variant={status === 'ACTIVE' ? 'success' : 'muted'}>
      {status === 'ACTIVE' ? 'Active' : 'Archived'}
    </Badge>
  )
}
