'use client'

import { useEffect } from 'react'
import { useMsal } from '@azure/msal-react'
import { InteractionStatus } from '@azure/msal-browser'
import { useRouter } from 'next/navigation'
import { loginRequest } from '@/lib/msalConfig'
import { useAppSelector } from '@/store/hooks'
import { Button } from '@/components/ui/button'
import { LoadingScreen } from '@/components/client/interactive/LoadingScreen'

export default function Home() {
  const { instance, inProgress } = useMsal()
  const router = useRouter()
  const token = useAppSelector((s) => s.auth.appAccessToken)

  // AuthInitializer may have restored the session — redirect if so
  useEffect(() => {
    if (token) {
      router.replace('/projects')
    }
  }, [token, router])

  const isRestoringAuth = !token && inProgress !== InteractionStatus.None

  if (isRestoringAuth) return <LoadingScreen />

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6">
      <h1 className="text-3xl font-semibold">Welcome</h1>
      <Button type="button" size="lg" onClick={() => instance.loginRedirect(loginRequest)}>
        Sign in with Microsoft
      </Button>
    </main>
  )
}
