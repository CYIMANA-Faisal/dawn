'use client'

import { StoreProvider } from './StoreProvider'
import { MsalAuthProvider } from './MsalAuthProvider'
import { AuthInitializer } from './AuthInitializer'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <MsalAuthProvider>
        <AuthInitializer>{children}</AuthInitializer>
      </MsalAuthProvider>
    </StoreProvider>
  )
}
