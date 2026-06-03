'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useWalletClient } from 'wagmi'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '@/lib/contract'
import { createEncryptedVault } from '@/lib/cdr'

type Recipient = {
  id: string
  name: string
  email: string
  vaultName: string
  message: string
}

type View = 'list' | 'create'

const INTERVALS = [
  { label: 'Every 1 minute (test)', value: '1m', seconds: 60 },
  { label: 'Every 1 hour', value: '1h', seconds: 3600 },
  { label: 'Every 1 day', value: '1d', seconds: 86400 },
  { label: 'Every 7 days', value: '7d', seconds: 604800 },
]

export default function VaultsPage() {
  const { isConnected, address } = useAccount()
  const router = useRouter()
  const [now, setNow] = useState(Date.now())
  const [view, setView] = useState<View>('list')
  const [selectedInterval, setSelectedInterval] = useState('1d')
  const [testatorEmail, setTestatorEmail] = useState('')
  const [pendingWillData, setPendingWillData] = useState<{ email: string; intervalSeconds: number } | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [recipients, setRecipients] = useState<Recipient[]>([
    { id: '1', name: '', email: '', vaultName: '', message: '' },
  ])

  useEffect(() => {
    if (!isConnected) router.push('/')
  }, [isConnected, router])

  // ── Đọc will từ contract ──
  const { data: willData, refetch: refetchWill } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'wills',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  // ── Đọc recipients từ contract ──
  const { data: recipientsData, refetch: refetchRecipients } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getRecipients',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  // ── Countdown timer — chạy mỗi giây, refetch mỗi 30s ──
  useEffect(() => {
    const ticker = window.setInterval(() => setNow(Date.now()), 1000)
    const fetcher = window.setInterval(() => {
      refetchWill()
      refetchRecipients()
    }, 30000)
    return () => {
      window.clearInterval(ticker)
      window.clearInterval(fetcher)
    }
  }, [])

  // ── Write contract ──
  const { writeContract, data: txHash, isPending: isWritePending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash })
  const { data: walletClient } = useWalletClient()

  // Sau khi tx confirm → refetch data
  useEffect(() => {
    if (isConfirmed) {
      setTimeout(() => {
        refetchWill()
        refetchRecipients()
      }, 2000)
    }
  }, [isConfirmed])

  // ── Parse data từ contract ──
  const will = willData
    ? {
        owner: (willData as any)[0] as string,
        checkInInterval: (willData as any)[1] as bigint,
        nextDeadline: (willData as any)[2] as bigint,
        missedCheckIns: (willData as any)[3] as bigint,
        active: (willData as any)[4] as boolean,
      }
    : undefined

  const contractRecipients = (recipientsData as {
    name: string
    email: string
    vaultName: string
    message: string
  }[] | undefined) ?? []

  const hasActiveWill = will?.active === true

  const canCheckIn = hasActiveWill

  // ── Countdown & progress ──
  const formatCountdown = (deadlineSec: bigint) => {
    const deadlineMs = Number(deadlineSec) * 1000
    const diff = Math.max(0, deadlineMs - now)
    const h = Math.floor(diff / 3600000).toString().padStart(2, '0')
    const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0')
    const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0')
    return `${h}:${m}:${s}`
  }

  const getProgress = (deadlineSec: bigint, intervalSec: bigint) => {
    const deadlineMs = Number(deadlineSec) * 1000
    const totalMs = Number(intervalSec) * 1000
    const remaining = Math.max(0, deadlineMs - now)
    return Math.round(((totalMs - remaining) / totalMs) * 100)
  }

  // ── Check In ──
  const handleCheckIn = () => {
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'checkIn',
    })
    toast.loading('Sending check-in transaction...', { id: 'checkin' })
  }

  useEffect(() => {
    if (isConfirming) {
      toast.loading('Confirming...', { id: 'checkin' })
    }
    if (isConfirmed) {
      toast.success('Check-in successful!', { id: 'checkin' })
      toast.success('Will cancelled.', { id: 'cancel' })
    }
  }, [isConfirming, isConfirmed])

  // ── Cancel Will ──
  const handleCancelWill = () => {
    if (!confirm('Are you sure you want to cancel your will? This cannot be undone.')) return
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'cancelWill',
    })
    toast.loading('Cancelling will...', { id: 'cancel' })
  }

  // ── Create Vault ──
  const addRecipient = () => {
    setRecipients((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: '', email: '', vaultName: '', message: '' },
    ])
  }

  const removeRecipient = (id: string) => {
    setRecipients((prev) => prev.filter((r) => r.id !== id))
  }

  const updateRecipient = (id: string, field: keyof Recipient, value: string) => {
    setRecipients((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    )
  }

  const handleCreateVault = () => {
    const invalid = recipients.some((r) => !r.name || !r.email || !r.vaultName || !r.message)
    if (invalid) {
      toast.error('Please fill in all fields for each recipient.')
      return
    }
    if (!testatorEmail) {
      toast.error('Please enter your email address.')
      return
    }
    setShowConfirmModal(true)
  }

  const handleConfirmCreate = async () => {
    setShowConfirmModal(false)
    if (!walletClient) {
      toast.error('Wallet not connected.')
      return
    }
    const intervalObj = INTERVALS.find((i) => i.value === selectedInterval)!
    setPendingWillData({ email: testatorEmail, intervalSeconds: intervalObj.seconds })

    // Step 1: Encrypt mỗi message và tạo CDR vault cho từng recipient
    toast.loading('Encrypting messages...', { id: 'create' })
    let vaultUuids: number[]
    try {
      vaultUuids = await Promise.all(
        recipients.map((r) => createEncryptedVault(r.message, walletClient))
      )
    } catch (err) {
      console.error('CDR Error:', err)
      toast.error('Failed to create encrypted vaults.', { id: 'create' })
      return
    }

    // Step 2: Gọi createWill với các uuid vừa tạo
    toast.loading('Creating will on-chain...', { id: 'create' })
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'createWill',
      args: [
        BigInt(intervalObj.seconds),
        recipients.map((r) => r.name),
        recipients.map((r) => r.email),
        recipients.map((r) => r.vaultName),
        vaultUuids.map((uuid) => uuid),
      ],
    })
    setView('list')
    setRecipients([{ id: crypto.randomUUID(), name: '', email: '', vaultName: '', message: '' }])
    setSelectedInterval('1d')
  }

  useEffect(() => {
    if (isConfirmed && view === 'list') {
      toast.success('Vault created successfully!', { id: 'create' })
      if (pendingWillData && address) {
        const now = Math.floor(Date.now() / 1000)
        fetch('/api/register-will', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ownerAddress: address,
            testatorEmail: pendingWillData.email,
            nextDeadline: now + pendingWillData.intervalSeconds,
            checkInInterval: pendingWillData.intervalSeconds,
          }),
        }).catch(console.error)
        setPendingWillData(null)
        setTestatorEmail('')
      }
    }
  }, [isConfirmed])

  // ── Create View ──
  if (view === 'create') {
    return (
      <main className="min-h-screen bg-[#09090f] text-[#f0e8d6]">
        <nav className="flex items-center justify-between px-8 py-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <span className="text-lg font-medium tracking-wide">
              ink<span className="text-[#c9a96e]">will</span>
            </span>
            <div className="w-11 h-11 rounded-md border border-white/10 flex items-center justify-center">
              <img
                src="/logo_active.png"
                alt="logo"
                className="w-9 h-9 object-contain"
                onError={(e: React.SyntheticEvent<HTMLImageElement>) => (e.currentTarget.style.display = 'none')}
              />
            </div>
          </div>
          <button
            onClick={() => setView('list')}
            className="text-sm text-[#f0e8d6]/40 hover:text-[#f0e8d6]/70 transition-colors"
          >
            Back to vaults
          </button>
        </nav>

        <div className="max-w-xl mx-auto px-6 py-10">
          <h1 className="text-xl font-medium text-[#f0e8d6] mb-1">Create a new vault</h1>
          <p className="text-sm text-[#f0e8d6]/35 mb-8">Add recipients and write a private message for each one.</p>

          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-[#f0e8d6]">Recipients</span>
          </div>

          <div className="flex flex-col gap-3 mb-6">
            {recipients.map((r, i) => (
              <div key={r.id} className="bg-[#111118] border border-white/7 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-[#c9a96e]/5 border-b border-white/6">
                  <span className="text-xs text-[#c9a96e] tracking-widest">
                    RECIPIENT {String(i + 1).padStart(2, '0')}
                  </span>
                  {recipients.length > 1 && (
                    <button
                      onClick={() => removeRecipient(r.id)}
                      className="w-6 h-6 rounded-md border border-white/7 flex items-center justify-center text-[#f0e8d6]/25 text-xs"
                    >
                      x
                    </button>
                  )}
                </div>

                <div className="p-4 flex flex-col gap-3">
                  <div className="flex gap-2">
                    <div style={{ flex: 3 }}>
                      <label className="block text-[10px] text-[#f0e8d6]/30 uppercase tracking-widest mb-1.5">
                        Recipient name
                      </label>
                      <input
                        type="text"
                        value={r.name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateRecipient(r.id, 'name', e.target.value)}
                        placeholder="e.g. Alice"
                        className="w-full px-3 py-2 bg-white/4 border border-white/8 rounded-lg text-sm text-[#f0e8d6] outline-none placeholder:text-[#f0e8d6]/20"
                      />
                    </div>
                    <div style={{ flex: 7 }}>
                      <label className="block text-[10px] text-[#f0e8d6]/30 uppercase tracking-widest mb-1.5">
                        Gmail address
                      </label>
                      <input
                        type="email"
                        value={r.email}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateRecipient(r.id, 'email', e.target.value)}
                        placeholder="recipient@gmail.com"
                        className="w-full px-3 py-2 bg-white/4 border border-white/8 rounded-lg text-sm text-[#f0e8d6] outline-none placeholder:text-[#f0e8d6]/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-[#f0e8d6]/30 uppercase tracking-widest mb-1.5">
                      Vault name
                    </label>
                    <input
                      type="text"
                      value={r.vaultName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateRecipient(r.id, 'vaultName', e.target.value)}
                      placeholder="e.g. Family Trust"
                      className="w-full px-3 py-2 bg-white/4 border border-white/8 rounded-lg text-sm text-[#f0e8d6] outline-none placeholder:text-[#f0e8d6]/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-[#f0e8d6]/30 uppercase tracking-widest mb-1.5">
                      Private message
                    </label>
                    <textarea
                      value={r.message}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateRecipient(r.id, 'message', e.target.value)}
                      placeholder="Write your message here..."
                      rows={3}
                      className="w-full px-3 py-2 bg-white/3 border border-white/7 rounded-lg text-xs text-[#f0e8d6]/70 italic outline-none resize-none leading-relaxed placeholder:text-[#f0e8d6]/18"
                    />
                  </div>

                  <div>
                    <p className="text-[10px] text-[#f0e8d6]/20 uppercase tracking-widest mb-1.5">Email preview</p>
                    <div className="flex gap-2.5 px-3 py-2.5 bg-white/2 border border-dashed border-white/8 rounded-lg">
                      <span className="text-[#f0e8d6]/25 text-sm mt-0.5">✉</span>
                      <p className="text-xs text-[#f0e8d6]/30 italic leading-relaxed">
                        Hello {r.name || '...'}, if you read this that means I am dead. Come to this link, I have something for you.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={addRecipient}
              className="w-full py-4 border border-dashed border-white/6 rounded-xl text-sm text-[#f0e8d6]/20 flex items-center justify-center gap-2"
            >
              + Add another recipient
            </button>
          </div>

          <div className="h-px bg-white/6 my-6" />

          <div className="mb-6">
            <label className="block text-sm font-medium text-[#f0e8d6] mb-2">Your email (for check-in reminders)</label>
            <input
              type="email"
              value={testatorEmail}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTestatorEmail(e.target.value)}
              placeholder="your@gmail.com"
              className="w-full px-3 py-2 bg-white/4 border border-white/8 rounded-lg text-sm text-[#f0e8d6] outline-none placeholder:text-[#f0e8d6]/20"
            />
            <p className="text-xs text-[#f0e8d6]/25 mt-1.5">We will send you a reminder before your deadline.</p>
          </div>

          <div className="mb-8">
            <p className="text-sm font-medium text-[#f0e8d6] mb-3">Check-in interval</p>
            <div className="flex gap-2.5">
              {INTERVALS.map((iv) => (
                <button
                  key={iv.value}
                  onClick={() => setSelectedInterval(iv.value)}
                  className={`flex-1 py-2.5 rounded-xl text-sm border transition-all ${
                    selectedInterval === iv.value
                      ? 'bg-[#c9a96e]/12 border-[#c9a96e]/35 text-[#c9a96e]'
                      : 'bg-[#111118] border-white/9 text-[#f0e8d6]/40'
                  }`}
                >
                  {iv.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-[#f0e8d6]/25 mt-2 leading-relaxed">
              Miss 3 check-ins and all vaults trigger automatically.
            </p>
          </div>

          <button
            onClick={handleCreateVault}
            disabled={isWritePending || isConfirming}
            className="w-full py-3.5 bg-[#c9a96e] text-[#0d0d1a] rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isWritePending || isConfirming ? 'Confirming...' : 'Create Vault'}
          </button>
          <p className="text-center text-xs text-[#f0e8d6]/20 mt-2">
            This will send a transaction to Story Testnet. Gas fees apply.
          </p>
        </div>

        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
            <div className="bg-[#111118] border border-white/10 rounded-2xl p-6 max-w-sm w-full">
              <div className="text-2xl mb-3 text-center">⚠️</div>
              <h2 className="text-base font-semibold text-[#f0e8d6] text-center mb-2">
                Important — Please read carefully
              </h2>
              <div className="flex flex-col gap-2 mb-5">
                <div className="flex gap-2.5 bg-white/3 border border-white/7 rounded-lg px-3 py-2.5">
                  <span className="text-[#f87171] text-sm mt-0.5">✉</span>
                  <p className="text-xs text-[#f0e8d6]/60 leading-relaxed">
                    Recipient Gmail addresses must be <strong className="text-[#f0e8d6]/80">100% correct</strong>. Once stored on-chain, they cannot be changed.
                  </p>
                </div>
                <div className="flex gap-2.5 bg-white/3 border border-white/7 rounded-lg px-3 py-2.5">
                  <span className="text-[#c9a96e] text-sm mt-0.5">⏱</span>
                  <p className="text-xs text-[#f0e8d6]/60 leading-relaxed">
                    Missing 3 check-ins will <strong className="text-[#f0e8d6]/80">automatically trigger</strong> all vaults and send emails to recipients.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm text-[#f0e8d6]/40"
                >
                  Go back
                </button>
                <button
                  onClick={handleConfirmCreate}
                  className="flex-1 py-2.5 rounded-xl bg-[#c9a96e] text-[#0d0d1a] text-sm font-semibold"
                >
                  I understand, create
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    )
  }

  // ── List View ──
  return (
    <main className="min-h-screen bg-[#09090f] text-[#f0e8d6]">
      <nav className="flex items-center justify-between px-8 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <span className="text-lg font-medium tracking-wide">
            ink<span className="text-[#c9a96e]">will</span>
          </span>
          <div className="w-11 h-11 rounded-md border border-white/10 flex items-center justify-center">
            <img
              src="/logo_active.png"
              alt="logo"
              className="w-9 h-9 object-contain"
              onError={(e: React.SyntheticEvent<HTMLImageElement>) => (e.currentTarget.style.display = 'none')}
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/30 border border-white/10 px-3 py-1.5 rounded-full">
            Story Testnet
          </span>
          <ConnectButton />
        </div>
      </nav>

      <div className="flex h-[calc(100vh-65px)]">
        <aside className="w-64 bg-[#111118] border-r border-white/5 p-4 flex flex-col gap-2">
          <p className="text-xs text-[#f0e8d6]/30 tracking-widest uppercase px-2 mb-2">My Vaults</p>

          {!hasActiveWill ? (
            <p className="text-xs text-[#f0e8d6]/25 px-2 py-3">No active will found.</p>
          ) : (
            <div className="text-left px-3 py-3 rounded-xl bg-[#c9a96e]/15 border border-[#c9a96e]/20">
              <div className="text-sm font-medium text-[#f0e8d6] mb-1">
                {contractRecipients.length === 1
                  ? contractRecipients[0].vaultName
                  : `${contractRecipients.length} vaults`}
              </div>
              <div className="text-xs text-[#f0e8d6]/40">
                {contractRecipients.length} recipients
              </div>
              <div className="flex items-center gap-1.5 mt-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#4ade80]" />
                <span className="text-xs text-[#4ade80]">Active</span>
              </div>
              <button
                onClick={handleCancelWill}
                disabled={isWritePending || isConfirming}
                className="mt-3 w-full py-1.5 rounded-lg border border-[#f87171]/30 text-[#f87171] text-xs disabled:opacity-40"
              >
                Cancel Will
              </button>
            </div>
          )}

          {!hasActiveWill && (
            <button
              onClick={() => setView('create')}
              className="mt-2 w-full py-2.5 rounded-xl border border-dashed border-[#c9a96e]/30 text-[#c9a96e] text-sm flex items-center justify-center gap-2"
            >
              + New Vault
            </button>
          )}
        </aside>

        <div className="flex-1 p-8 overflow-y-auto">
          {!hasActiveWill ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <p className="text-[#f0e8d6]/40 mb-4 text-sm">You have no active will on-chain.</p>
              <button
                onClick={() => setView('create')}
                className="px-6 py-3 bg-[#c9a96e] text-[#0d0d1a] rounded-xl text-sm font-semibold"
              >
                Create Your First Vault
              </button>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-xl font-medium text-[#f0e8d6] mb-2">
                  {contractRecipients.length === 1
                    ? contractRecipients[0].vaultName
                    : `Group (${contractRecipients.length} recipients)`}
                </h1>
                <div className="flex gap-2">
                  <span className="text-xs px-2.5 py-1 rounded-full border border-[#4ade80]/30 text-[#4ade80]">
                    Active
                  </span>
                  <span className="text-xs px-2.5 py-1 rounded-full border border-[#c9a96e]/30 text-[#c9a96e]">
                    {contractRecipients.length} recipients
                  </span>
                </div>
              </div>

              <div className="bg-[#111118] border border-white/7 rounded-xl p-5 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs text-[#f0e8d6]/40">Next check-in deadline</span>
                  <span className="text-xl font-medium text-[#c9a96e] font-mono" suppressHydrationWarning>
                    {formatCountdown(will!.nextDeadline)}
                  </span>
                </div>
                <div className="h-1 bg-white/5 rounded-full mb-4">
                  <div
                    className="h-1 bg-[#c9a96e] rounded-full transition-all"
                    style={{ width: `${getProgress(will!.nextDeadline, will!.checkInInterval)}%` }}
                    suppressHydrationWarning
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-[#f0e8d6]/30 mb-2">Missed check-ins</div>
                    <div className="flex gap-1.5">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className={`w-2.5 h-2.5 rounded-full ${
                            i < Number(will!.missedCheckIns) ? 'bg-[#f87171]' : 'bg-white/10'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={handleCheckIn}
                    disabled={isWritePending || isConfirming || !canCheckIn}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#c9a96e] text-[#0d0d1a] rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isWritePending || isConfirming ? 'Confirming...' : 'Check In Now'}
                  </button>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-[#f0e8d6] mb-4">Recipients</p>
                <div className="flex flex-col gap-3">
                  {contractRecipients.map((r, i) => (
                    <div
                      key={i}
                      className="bg-[#111118] border border-white/7 rounded-xl p-4 flex items-center gap-4"
                    >
                      <div className="w-9 h-9 rounded-full bg-[#c9a96e]/15 flex items-center justify-center text-[#c9a96e] font-medium text-sm flex-shrink-0">
                        {r.name[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm text-[#f0e8d6]">{r.name}</span>
                          <span className="text-xs text-[#f0e8d6]/30">·</span>
                          <span className="text-xs text-[#f0e8d6]/40">{r.email}</span>
                        </div>
                        <div className="text-xs text-[#c9a96e]/60 mb-1">{r.vaultName}</div>
                        <div className="text-xs text-[#f0e8d6]/35 italic truncate">
                          {r.message}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
