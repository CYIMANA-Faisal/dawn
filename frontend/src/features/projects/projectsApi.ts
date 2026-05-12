import { Api } from '@/store/Api'
import type {
  CreateProjectRequest,
  ProjectResponse,
  ProjectsListResponse,
  UpdateProjectRequest,
} from './types'

const PROJECTS_BASE_URL = '/projects'

export const projectsApi = Api.injectEndpoints({
  endpoints: (builder) => ({
    getProjects: builder.query<ProjectsListResponse, void>({
      query: () => PROJECTS_BASE_URL,
      providesTags: (result) =>
        result
          ? [
              ...result.map((project) => ({
                type: 'Projects' as const,
                id: project.id,
              })),
              { type: 'Projects', id: 'LIST' },
            ]
          : [{ type: 'Projects', id: 'LIST' }],
    }),

    getProjectById: builder.query<ProjectResponse, string>({
      query: (id) => `${PROJECTS_BASE_URL}/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Projects', id }],
    }),

    createProject: builder.mutation<ProjectResponse, CreateProjectRequest>({
      query: (body) => ({
        url: PROJECTS_BASE_URL,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Projects', id: 'LIST' }],
    }),

    updateProject: builder.mutation<
      ProjectResponse,
      { id: string; body: UpdateProjectRequest }
    >({
      query: ({ id, body }) => ({
        url: `${PROJECTS_BASE_URL}/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Projects', id },
        { type: 'Projects', id: 'LIST' },
      ],
    }),

    archiveProject: builder.mutation<ProjectResponse, string>({
      query: (id) => ({
        url: `${PROJECTS_BASE_URL}/${id}/archive`,
        method: 'PATCH',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Projects', id },
        { type: 'Projects', id: 'LIST' },
      ],
    }),
  }),
})

export const {
  useGetProjectsQuery,
  useGetProjectByIdQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useArchiveProjectMutation,
} = projectsApi
