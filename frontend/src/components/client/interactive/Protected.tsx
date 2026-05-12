'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppSelector } from '@/store/hooks'

export function Protected({ children }: { children: React.ReactNode }) {
  const token = useAppSelector((s) => s.auth.appAccessToken)
  const router = useRouter()

  useEffect(() => {
    if (!token) {
      router.push('/')
    }
  }, [token, router])

  if (!token) return null

  return <>{children}</>
}
