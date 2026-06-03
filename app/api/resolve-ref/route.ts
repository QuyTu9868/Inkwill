import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/redis'

export async function GET(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get('ref')
  if (!ref) {
    return NextResponse.json({ error: 'Missing ref' }, { status: 400 })
  }

  const data = await redis.get(`claim-ref:${ref}`) as {
    ownerAddress: string
    recipientEmail: string
  } | null

  if (!data) {
    return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 })
  }

  return NextResponse.json(data)
}