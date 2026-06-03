'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function LandingPage() {
  const { isConnected } = useAccount()
  const router = useRouter()

  useEffect(() => {
    if (isConnected) router.push('/vaults')
  }, [isConnected, router])

  return (
    <main className="min-h-screen bg-[#09090f] text-[#f0e8d6]">
      {/* NAVBAR */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <span className="text-lg font-medium tracking-wide">
            ink<span className="text-[#c9a96e]">will</span>
          </span>
          {/* LOGO PLACEHOLDER */}
          <div className="w-7 h-7 rounded-md border border-white/10 flex items-center justify-center">
            <img src="/logo_active.png" alt="Inkwill logo" className="w-5 h-5 object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/30 border border-white/10 px-3 py-1.5 rounded-full">
            Story Testnet
          </span>
          <ConnectButton />
        </div>
      </nav>

      {/* HERO */}
      <section className="flex flex-col items-center text-center px-6 pt-24 pb-16">
        <div className="text-xs tracking-widest uppercase text-[#c9a96e] border border-[#c9a96e]/30 px-4 py-1.5 rounded-full mb-6">
          Dead Man's Switch · On-Chain
        </div>
        <h1 className="text-4xl md:text-5xl font-medium leading-tight mb-4 max-w-xl">
          Your legacy,{' '}
          <span className="text-[#c9a96e]">delivered</span>{' '}
          when it matters.
        </h1>
        <p className="text-sm text-[#f0e8d6]/40 leading-relaxed max-w-md mb-10">
          Create a private vault with messages for your loved ones. If you stop checking in, they receive everything — automatically.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <ConnectButton.Custom>
            {({ openConnectModal }) => (
              <button
                onClick={openConnectModal}
                className="flex items-center gap-2 px-6 py-3 bg-[#c9a96e] text-[#0d0d1a] rounded-xl font-semibold text-sm"
              >
                Create a Vault
              </button>
            )}
          </ConnectButton.Custom>
          <button
            onClick={() => router.push('/claim')}
            className="flex items-center gap-2 px-6 py-3 border border-[#c9a96e]/35 text-[#c9a96e] rounded-xl text-sm"
          >
            I received an inheritance
          </button>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="max-w-4xl mx-auto px-6 pb-24 grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            num: '01',
            title: 'Create your vault',
            desc: 'Connect wallet, set a check-in interval, and write private messages for each recipient.',
          },
          {
            num: '02',
            title: 'Check in regularly',
            desc: 'Sign a transaction periodically to prove you\'re active. Miss 3 times and the vault triggers.',
          },
          {
            num: '03',
            title: 'Recipients are notified',
            desc: 'Each recipient gets an email with a link. They sign in with that Gmail and read their message.',
          },
        ].map((step) => (
          <div
            key={step.num}
            className="bg-[#111118] border border-white/7 rounded-xl p-5"
          >
            <div className="text-xs text-[#c9a96e] tracking-widest mb-3">{step.num}</div>
            <div className="text-sm font-medium text-[#f0e8d6] mb-2">{step.title}</div>
            <div className="text-xs text-[#f0e8d6]/40 leading-relaxed">{step.desc}</div>
          </div>
        ))}
      </section>
    </main>
  )
}