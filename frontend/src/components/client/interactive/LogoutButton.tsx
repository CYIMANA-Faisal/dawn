'use client'

import { useMsal } from '@azure/msal-react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { useAppDispatch } from '@/store/hooks'
import { clearCredentials } from '@/features/auth/authSlice'
import { Button } from '@/components/ui/button'

export function LogoutButton() {
  const { instance } = useMsal()
  const dispatch = useAppDispatch()
  const router = useRouter()

  const logout = async () => {
    await instance.clearCache()
    dispatch(clearCredentials())
    router.push('/')
  }

  return (
    <Button type="button" variant="destructive" size="sm" onClick={logout}>
      <LogOut className="h-4 w-4" />
      Logout
    </Button>
  )
}
