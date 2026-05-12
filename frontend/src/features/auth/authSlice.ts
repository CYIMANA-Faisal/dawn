import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { User } from '@/types/api'

type AuthState = {
  appAccessToken: string | null
  user: User | null
}

const initialState: AuthState = {
  appAccessToken: null,
  user: null,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<AuthState>) => {
      state.appAccessToken = action.payload.appAccessToken
      state.user = action.payload.user
    },
    clearCredentials: (state) => {
      state.appAccessToken = null
      state.user = null
    },
  },
})

export const { setCredentials, clearCredentials } = authSlice.actions
export default authSlice.reducer
