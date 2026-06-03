import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/redis'
import { Resend } from 'resend'
import { createPublicClient, createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { createHash } from 'crypto'
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '@/lib/contract'

const resend = new Resend(process.env.RESEND_API_KEY)
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://inkwill.vercel.app'

const storyTestnet = {
  id: 1315,
  name: 'Story Testnet',
  nativeCurrency: { name: 'IP', symbol: 'IP', decimals: 18 },
  rpcUrls: { default: { http: ['https://aeneid.storyrpc.io'] } },
} as const

const account = privateKeyToAccount(process.env.CRON_WALLET_PRIVATE_KEY as `0x${string}`)

const publicClient = createPublicClient({
  chain: storyTestnet,
  transport: http('https://aeneid.storyrpc.io'),
})

const walletClient = createWalletClient({
  account,
  chain: storyTestnet,
  transport: http('https://aeneid.storyrpc.io'),
})

type WillRecord = {
  ownerAddress: string
  testatorEmail: string
  nextDeadline: number
  checkInInterval: number
  notifiedAt: number | null
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function GET(req: NextRequest) {
  try {
    const owners = await redis.smembers('wills:all') as string[]

    for (const owner of owners) {
      const record = await redis.get(`will:${owner}`) as WillRecord | null
      if (!record) continue

      const willData = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'wills',
        args: [owner as `0x${string}`],
      }) as unknown as any[]

      const active = willData[4] as boolean
      const nextDeadline = Number(willData[2])
      const checkInInterval = Number(willData[1])
      const missedCheckIns = Number(willData[3])

      await redis.set(`will:${owner}`, {
        ...record,
        nextDeadline,
        checkInInterval,
      })

      const now = Math.floor(Date.now() / 1000)
      const timeLeft = nextDeadline - now

      // ── Gọi recordMissedCheckIn nếu deadline đã qua ──
      if (active && timeLeft <= 0) {
        try {
          const txHash = await walletClient.writeContract({
            address: CONTRACT_ADDRESS,
            abi: CONTRACT_ABI,
            functionName: 'recordMissedCheckIn',
            args: [owner as `0x${string}`],
          })
          // Chờ tx confirm trước khi gọi triggerWill
          await publicClient.waitForTransactionReceipt({ hash: txHash })
        } catch (err) {
          console.error(`recordMissedCheckIn failed for ${owner}:`, err)
          continue
        }

        // Nếu đủ 3 missed → trigger
        if (missedCheckIns + 1 >= 3) {
          await sleep(2000) // thêm buffer
          try {
            const txHash = await walletClient.writeContract({
              address: CONTRACT_ADDRESS,
              abi: CONTRACT_ABI,
              functionName: 'triggerWill',
              args: [owner as `0x${string}`],
            })
            await publicClient.waitForTransactionReceipt({ hash: txHash })
          } catch (err) {
            console.error(`triggerWill failed for ${owner}:`, err)
          }
        }

        continue
      }

      // ── Gửi email nhắc testator nếu còn < 20% interval ──
      const threshold = checkInInterval * 0.2
      if (active && timeLeft > 0 && timeLeft < threshold) {
        const alreadyNotified = record.notifiedAt &&
          now - record.notifiedAt < checkInInterval * 0.1

        if (!alreadyNotified) {
          await resend.emails.send({
            from: 'Inkwill <onboarding@resend.dev>',
            to: record.testatorEmail,
            subject: '⚠️ Inkwill: Check-in reminder',
            html: `
              <div style="font-family:sans-serif;max-width:480px;margin:auto">
                <h2>Time to check in</h2>
                <p>Your Inkwill vault will trigger in <strong>${Math.round(timeLeft / 60)} minutes</strong> if you don't check in.</p>
                <a href="${APP_URL}/vaults" style="display:inline-block;padding:12px 24px;background:#c9a96e;color:#0d0d1a;border-radius:8px;text-decoration:none;font-weight:bold">
                  Check In Now
                </a>
              </div>
            `,
          })

          await redis.set(`will:${owner}`, {
            ...record,
            nextDeadline,
            checkInInterval,
            notifiedAt: now,
          })
        }
      }

      // ── Gửi email cho recipients nếu will đã triggered ──
      if (!active) {
        const alreadyTriggered = await redis.get(`triggered:${owner}`)
        if (!alreadyTriggered) {
          const recipientsData = await publicClient.readContract({
            address: CONTRACT_ADDRESS,
            abi: CONTRACT_ABI,
            functionName: 'getRecipients',
            args: [owner as `0x${string}`],
          }) as unknown as { name: string; email: string; vaultName: string; message: string }[]

          for (const recipient of recipientsData) {
            const ref = createHash('sha256')
              .update(owner + recipient.email.toLowerCase())
              .digest('hex')

            await redis.set(`claim-ref:${ref}`, {
              ownerAddress: owner,
              recipientEmail: recipient.email.toLowerCase(),
            })

            await resend.emails.send({
              from: 'Inkwill <onboarding@resend.dev>',
              to: recipient.email,
              subject: `📬 ${recipient.name}, you have an inheritance`,
              html: `
                <div style="font-family:sans-serif;max-width:480px;margin:auto">
                  <h2>You have an inheritance</h2>
                  <p>Hello <strong>${recipient.name}</strong>,</p>
                  <p>Someone has left you a message in their Inkwill vault: <strong>${recipient.vaultName}</strong>.</p>
                  <p>Click below to sign in with your Gmail and read the message.</p>
                  <a href="${APP_URL}/claim?ref=${ref}" style="display:inline-block;padding:12px 24px;background:#c9a96e;color:#0d0d1a;border-radius:8px;text-decoration:none;font-weight:bold">
                    Open My Inheritance
                  </a>
                </div>
              `,
            })
          }

          await redis.set(`triggered:${owner}`, true)
        }
      }
    }

   return NextResponse.json({ success: true, processed: owners.length })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  return GET(req)
} 