'use client'

import { usePrivy, useWallets } from '@privy-io/react-auth'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useReadContract } from 'wagmi'
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '@/lib/contract'
import { decryptVault } from '@/lib/cdr'

type Recipient = {
  name: string
  email: string
  vaultName: string
  vaultUuid: number
}

function ClaimContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const ownerAddress = searchParams.get('owner') as `0x${string}` | null

  const { ready, authenticated, user, login, logout } = usePrivy()
  const { wallets } = useWallets()
  const [openedVault, setOpenedVault] = useState(false)
  const [decryptedMessage, setDecryptedMessage] = useState<string | null>(null)
  const [isDecrypting, setIsDecrypting] = useState(false)
  const [decryptError, setDecryptError] = useState<string | null>(null)

  // Lấy email Gmail từ Privy
  const userEmail = user?.google?.email ?? null

  // Đọc recipients từ contract theo owner address trong URL
  const { data: recipientsData, isLoading } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getRecipients',
    args: ownerAddress ? [ownerAddress] : undefined,
    query: { enabled: !!ownerAddress },
  })

  // Đọc will info (để kiểm tra active)
  const { data: willData } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'wills',
    args: ownerAddress ? [ownerAddress] : undefined,
    query: { enabled: !!ownerAddress },
  })

  const recipients = (recipientsData as Recipient[] | undefined) ?? []
  const will = willData as { active: boolean; owner: string } | undefined

  // Tìm recipient khớp email đang đăng nhập
  const myRecipient = authenticated && userEmail
    ? recipients.find((r) => r.email.toLowerCase() === userEmail.toLowerCase())
    : null

  // Will đã triggered = will không còn active (owner đã miss check-in)
  const isTriggered = will?.active === false && recipients.length > 0

  const handleOpenVault = async () => {
    if (!myRecipient) return

    // Lấy embedded wallet từ Privy
    const embeddedWallet = wallets.find((w) => w.walletClientType === 'privy')
    if (!embeddedWallet) {
      setDecryptError('No embedded wallet found. Please sign in again.')
      return
    }

    setIsDecrypting(true)
    setDecryptError(null)

    try {
      const provider = await embeddedWallet.getEthereumProvider()
const { createWalletClient, custom } = await import('viem')
const walletClient = createWalletClient({
  transport: custom(provider),
  account: embeddedWallet.address as `0x${string}`,
})
const message = await decryptVault(myRecipient.vaultUuid, walletClient)
      setDecryptedMessage(message)
      setOpenedVault(true)
    } catch (err) {
      setDecryptError('Failed to decrypt. Please try again.')
      console.error(err)
    } finally {
      setIsDecrypting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#09090f] text-[#f0e8d6]">
      {/* NAVBAR */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/')} className="text-lg font-medium tracking-wide">
            ink<span className="text-[#c9a96e]">will</span>
          </button>
          <div className="w-7 h-7 rounded-md border border-white/10 flex items-center justify-center">
            <img
              src={isTriggered ? "/logo_triggered.png" : "/logo_active.png"}
              alt="Inkwill logo"
              className="w-5 h-5 object-contain"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/30 border border-white/10 px-3 py-1.5 rounded-full">
            Story Testnet
          </span>
          {authenticated && (
            <button
              onClick={logout}
              className="text-xs text-[#f0e8d6]/30 hover:text-[#f0e8d6]/60 transition-colors"
            >
              Sign out
            </button>
          )}
        </div>
      </nav>

      <div className="flex flex-col items-center px-6 py-16">
        {/* HERO */}
        <div className="text-center mb-10 max-w-md">
          <div className="w-14 h-14 rounded-full border border-[#c9a96e]/30 flex items-center justify-center mx-auto mb-5 text-2xl">
            ✉️
          </div>
          <h1 className="text-2xl font-medium text-[#f0e8d6] mb-3">You have an inheritance</h1>
          <p className="text-sm text-[#f0e8d6]/40 leading-relaxed">
            Sign in with the Gmail address that received the notification. Your identity will be verified automatically.
          </p>
        </div>

        {/* SIGN IN */}
        {!ready ? (
          <div className="w-5 h-5 border-2 border-[#c9a96e]/30 border-t-[#c9a96e] rounded-full animate-spin mb-10" />
        ) : !authenticated ? (
          <button
            onClick={login}
            className="flex items-center justify-center gap-3 w-80 py-3.5 bg-[#111118] border border-white/12 rounded-xl text-sm text-[#f0e8d6] mb-10"
          >
            <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center flex-shrink-0">
              <span className="text-[#EA4335] text-xs font-bold" style={{ fontFamily: 'Arial' }}>G</span>
            </div>
            Continue with Gmail
          </button>
        ) : (
          <div className="flex items-center gap-2 mb-10 px-4 py-2 rounded-full border border-[#4ade80]/30 bg-[#4ade80]/10">
            <div className="w-1.5 h-1.5 rounded-full bg-[#4ade80]" />
            <span className="text-xs text-[#4ade80]">Signed in as {userEmail}</span>
          </div>
        )}

        {/* NỘI DUNG SAU KHI ĐĂNG NHẬP */}
        {authenticated && (
          <div className="w-full max-w-lg">
            {/* Không có owner trong URL */}
            {!ownerAddress && (
              <div className="text-center text-sm text-[#f0e8d6]/30 py-12">
                Invalid link. Please use the link from your email notification.
              </div>
            )}

            {/* Đang load */}
            {ownerAddress && isLoading && (
              <div className="flex justify-center py-12">
                <div className="w-5 h-5 border-2 border-[#c9a96e]/30 border-t-[#c9a96e] rounded-full animate-spin" />
              </div>
            )}

            {/* Không tìm thấy will */}
            {ownerAddress && !isLoading && recipients.length === 0 && (
              <div className="text-center text-sm text-[#f0e8d6]/30 py-12">
                No will found for this address.
              </div>
            )}

            {/* Email không khớp với bất kỳ recipient nào */}
            {ownerAddress && !isLoading && recipients.length > 0 && !myRecipient && (
              <div className="text-center text-sm text-[#f0e8d6]/30 py-12">
                Your Gmail ({userEmail}) is not listed as a recipient of this will.
              </div>
            )}

            {/* Tìm thấy recipient */}
            {ownerAddress && !isLoading && myRecipient && (
              <div
                className="bg-[#111118] rounded-xl overflow-hidden"
                style={{
                  border: isTriggered
                    ? '0.5px solid rgba(201,169,110,0.2)'
                    : '0.5px solid rgba(255,255,255,0.07)',
                }}
              >
                {/* CARD HEADER */}
                <div
                  className="flex items-center justify-between px-5 py-4 border-b"
                  style={{
                    background: isTriggered ? 'rgba(201,169,110,0.06)' : 'rgba(255,255,255,0.02)',
                    borderColor: isTriggered ? 'rgba(201,169,110,0.15)' : 'rgba(255,255,255,0.07)',
                  }}
                >
                  <span className="text-sm font-medium text-[#f0e8d6]">{myRecipient.vaultName}</span>
                  {isTriggered ? (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-[#f87171]/10 border border-[#f87171]/30 text-[#f87171]">
                      Triggered
                    </span>
                  ) : (
                    <span className="text-xs px-2.5 py-1 rounded-full border border-white/10 text-[#f0e8d6]/30">
                      Not yet available
                    </span>
                  )}
                </div>

                {/* CARD BODY */}
                <div className="px-5 py-4">
                  <p className="text-xs text-[#f0e8d6]/30 mb-3">
                    From: {ownerAddress.slice(0, 6)}...{ownerAddress.slice(-4)}
                  </p>

                  {isTriggered && !openedVault && (
                    <>
                      {decryptError && (
                        <div className="mb-3 text-xs text-[#f87171]">{decryptError}</div>
                      )}
                      <button
                        onClick={handleOpenVault}
                        disabled={isDecrypting}
                        className="w-full py-3 bg-[#c9a96e] text-[#0d0d1a] rounded-lg text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                      >
                        {isDecrypting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-[#0d0d1a]/30 border-t-[#0d0d1a] rounded-full animate-spin" />
                            Decrypting...
                          </>
                        ) : (
                          '🔓 Open full message'
                        )}
                      </button>
                    </>
                  )}

                  {isTriggered && openedVault && decryptedMessage && (
                    <>
                      <div className="bg-white/3 border-l-2 border-[#c9a96e] pl-3 py-3 rounded-r-lg mb-3 text-xs text-[#f0e8d6]/70 italic leading-relaxed">
                        &ldquo;{decryptedMessage}&rdquo;
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#4ade80]">
                        <span>✓</span>
                        <span>Message unlocked</span>
                      </div>
                    </>
                  )}

                  {!isTriggered && (
                    <div className="flex items-center gap-2 py-2 text-xs text-[#f0e8d6]/30">
                      🔒 This message will be available when the vault is triggered.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}

import { Suspense } from 'react'

export default function ClaimPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#09090f]" />}>
      <ClaimContent />
    </Suspense>
  )
}
