import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { RootState } from '@/store/store'

export const Api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.appAccessToken
      if (token) {
        headers.set('Authorization', `Bearer ${token}`)
      }
      return headers
    },
  }),
  tagTypes: ['User', 'Projects', 'Shareholders', 'Forms'],
  endpoints: () => ({}),
})
