'use client'

import { useEffect } from 'react'
import { useMsal } from '@azure/msal-react'
import { InteractionStatus } from '@azure/msal-browser'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { useLoginWithMicrosoftMutation } from '@/features/auth/authApi'
import { setCredentials } from '@/features/auth/authSlice'
import { loginRequest } from '@/lib/msalConfig'
import { LoadingScreen } from '@/components/client/interactive/LoadingScreen'

export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { instance, accounts, inProgress } = useMsal()
  const dispatch = useAppDispatch()
  const token = useAppSelector((s) => s.auth.appAccessToken)
  const [loginWithMicrosoft, { isUninitialized, isLoading }] =
    useLoginWithMicrosoftMutation()

  useEffect(() => {
    // Wait until MSAL has finished its startup / redirect handling
    if (inProgress !== InteractionStatus.None) return
    if (token) return
    if (accounts.length === 0) return
    if (!isUninitialized) return

    const restore = async () => {
      try {
        const response = await instance.acquireTokenSilent({
          ...loginRequest,
          account: accounts[0],
        })
        const backend = await loginWithMicrosoft({ token: response.idToken }).unwrap()
        dispatch(setCredentials(backend))
      } catch {
        // Silent restore failed — user will see the login page
      }
    }

    void restore()
  }, [accounts, dispatch, inProgress, instance, isUninitialized, loginWithMicrosoft, token])

  const hasMicrosoftSession = accounts.length > 0
  const isMsalBusy = inProgress !== InteractionStatus.None
  const shouldRestoreSession = !token && hasMicrosoftSession
  const shouldBlockRender =
    (!token && isMsalBusy) || (shouldRestoreSession && (isUninitialized || isLoading))

  if (shouldBlockRender) return <LoadingScreen />

  return <>{children}</>
}
