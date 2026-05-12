export type ProjectStatus = 'ACTIVE' | 'ARCHIVED'

export type Project = {
  id: string
  identifier: string
  name: string
  createdByUserId: string
  createdByName?: string | null
  createdAt: string
  status: ProjectStatus
}

export type CreateProjectRequest = {
  name: string
}

export type UpdateProjectRequest = {
  name: string
}

export type ProjectsListResponse = Project[]

export type ProjectResponse = Project
