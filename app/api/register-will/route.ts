import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/redis'
import { createHash } from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const { ownerAddress, testatorEmail, nextDeadline, checkInInterval, recipientEmails } = await req.json()

    if (!ownerAddress || !testatorEmail || !nextDeadline || !checkInInterval) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const owner = ownerAddress.toLowerCase()

    await redis.set(`will:${owner}`, {
      ownerAddress: owner,
      testatorEmail,
      nextDeadline,
      checkInInterval,
      notifiedAt: null,
    })

    await redis.sadd('wills:all', owner)

    // Generate ref cho từng recipient email
    if (Array.isArray(recipientEmails)) {
      for (const email of recipientEmails) {
        const ref = createHash('sha256')
          .update(owner + email.toLowerCase())
          .digest('hex')

        await redis.set(`claim-ref:${ref}`, {
          ownerAddress: owner,
          recipientEmail: email.toLowerCase(),
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}