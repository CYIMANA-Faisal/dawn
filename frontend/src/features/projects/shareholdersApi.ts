import { Api } from '@/store/Api'
import type {
  CreateShareholderRequest,
  PublicShareholder,
  ShareholderDropdownItem,
  Shareholder,
  ShareholdersPage,
} from './shareholdersTypes'

type GetShareholdersArgs = {
  projectId: string
  page?: number
  size?: number
}

type UploadShareholdersArgs = {
  projectId: string
  file: File
}

type CreateShareholderArgs = {
  projectId: string
  body: CreateShareholderRequest
}

type GetPublicShareholderArgs = {
  projectId: string
  shareholderId: string
}

const SHAREHOLDERS_TAG = 'Shareholders' as const

export const shareholdersApi = Api.injectEndpoints({
  endpoints: (builder) => ({
    getShareholders: builder.query<ShareholdersPage, GetShareholdersArgs>({
      query: ({ projectId, page = 0, size = 20 }) => ({
        url: `/projects/${projectId}/shareholders`,
        params: { page, size },
      }),
      providesTags: (result, _error, { projectId }) => {
        if (!result) {
          return [{ type: SHAREHOLDERS_TAG, id: `LIST-${projectId}` }]
        }

        return [
          ...result.content.map((shareholder) => ({
            type: SHAREHOLDERS_TAG,
            id: shareholder.id,
          })),
          { type: SHAREHOLDERS_TAG, id: `LIST-${projectId}` },
        ]
      },
    }),

    uploadShareholders: builder.mutation<void, UploadShareholdersArgs>({
      query: ({ projectId, file }) => {
        const formData = new FormData()
        formData.append('file', file)

        return {
          url: `/projects/${projectId}/shareholders/upload`,
          method: 'POST',
          body: formData,
        }
      },
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: SHAREHOLDERS_TAG, id: `LIST-${projectId}` },
      ],
    }),

    createShareholder: builder.mutation<Shareholder, CreateShareholderArgs>({
      query: ({ projectId, body }) => ({
        url: `/projects/${projectId}/shareholders`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: SHAREHOLDERS_TAG, id: `LIST-${projectId}` },
      ],
    }),

    getShareholdersDropdown: builder.query<ShareholderDropdownItem[], string>({
      query: (projectId) => `/projects/${projectId}/shareholders/dropdown`,
      providesTags: (_result, _error, projectId) => [
        { type: SHAREHOLDERS_TAG, id: `LIST-${projectId}` },
      ],
    }),

    getPublicShareholder: builder.query<PublicShareholder, GetPublicShareholderArgs>({
      query: ({ projectId, shareholderId }) =>
        `/projects/${projectId}/shareholders/${shareholderId}/public`,
      providesTags: (_result, _error, { shareholderId }) => [
        { type: SHAREHOLDERS_TAG, id: shareholderId },
      ],
    }),
  }),
})

export const {
  useCreateShareholderMutation,
  useGetPublicShareholderQuery,
  useGetShareholdersDropdownQuery,
  useGetShareholdersQuery,
  useUploadShareholdersMutation,
} = shareholdersApi
