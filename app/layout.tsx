'use client'

import { RainbowKitProvider} from '@rainbow-me/rainbowkit'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config } from '@/lib/wagmi'
import { Toaster } from 'react-hot-toast'
import PrivyProviderWrapper from '@/providers/PrivyProviderWrapper'
import '@rainbow-me/rainbowkit/styles.css'
import './globals.css'

const queryClient = new QueryClient()

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PrivyProviderWrapper>
          <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
              <RainbowKitProvider>
                {children}
                <Toaster position="top-right" />
              </RainbowKitProvider>
            </QueryClientProvider>
          </WagmiProvider>
        </PrivyProviderWrapper>
      </body>
    </html>
  )
}