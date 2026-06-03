import { NextResponse } from 'next/server'

export async function GET() {
  const res = await fetch('https://aeneid.storyrpc.io/dkg/latest_active')
  const data = await res.json()
  return NextResponse.json(data)
}
