'use client'

import { PrivyProvider } from '@privy-io/react-auth'

export default function PrivyProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId="cmp8hn8hj01pt0dkz1kd4jam0"
      config={{
        loginMethods: ['google'],
        appearance: {
          theme: 'dark',
        },
      }}
    >
      {children}
    </PrivyProvider>
  )
}