import { Api } from '@/store/Api'
import type { AuthResponse } from '@/types/api'

export const authApi = Api.injectEndpoints({
  endpoints: (build) => ({
    loginWithMicrosoft: build.mutation<AuthResponse, { token: string }>({
      query: (body) => ({
        url: '/auth/microsoft',
        method: 'POST',
        body,
      }),
    }),
  }),
})

export const { useLoginWithMicrosoftMutation } = authApi
