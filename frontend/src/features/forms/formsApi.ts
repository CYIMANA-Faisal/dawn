import { Api } from '@/store/Api'
import type {
  DistributeFormRequest,
  DistributeFormResponse,
  FormDropdownItem,
  FormSchema,
  SubmitFormRequest,
  SubmitFormResponse,
} from './formsTypes'

type DistributeFormArgs = {
  projectId: string
  formId: string
  body: DistributeFormRequest
}

type SubmitPublicFormArgs = {
  formId: string
  body: SubmitFormRequest
}

const FORMS_TAG = 'Forms' as const

export const formsApi = Api.injectEndpoints({
  endpoints: (builder) => ({
    getFormById: builder.query<FormSchema, string>({
      query: (formId) => `/forms/${formId}`,
      providesTags: (_result, _error, formId) => [{ type: FORMS_TAG, id: formId }],
    }),

    getFormsDropdown: builder.query<FormDropdownItem[], void>({
      query: () => '/forms/dropdown',
      providesTags: (result) =>
        result
          ? [
              ...result.map((form) => ({ type: FORMS_TAG, id: form.id })),
              { type: FORMS_TAG, id: 'DROPDOWN' },
            ]
          : [{ type: FORMS_TAG, id: 'DROPDOWN' }],
    }),

    distributeForm: builder.mutation<DistributeFormResponse, DistributeFormArgs>({
      query: ({ projectId, formId, body }) => ({
        url: `/forms/projects/${projectId}/forms/${formId}/distribute`,
        method: 'POST',
        body,
      }),
    }),

    submitPublicForm: builder.mutation<SubmitFormResponse, SubmitPublicFormArgs>({
      query: ({ formId, body }) => ({
        url: `/forms/${formId}/submit`,
        method: 'POST',
        body,
        responseHandler: async (response) => {
          const responseText = await response.text()

          if (!responseText.trim()) {
            return {}
          }

          try {
            return JSON.parse(responseText) as SubmitFormResponse
          } catch {
            return { message: responseText }
          }
        },
      }),
    }),
  }),
})

export const {
  useDistributeFormMutation,
  useGetFormByIdQuery,
  useGetFormsDropdownQuery,
  useSubmitPublicFormMutation,
} = formsApi
