import { NextRequest, NextResponse } from 'next/server'

const CDR_API = 'http://172.192.41.96:1317'

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: pathSegments } = await params
  const path = '/' + pathSegments.join('/')
  const search = req.nextUrl.search
  try {
    const res = await fetch(`${CDR_API}${path}${search}`)
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    return NextResponse.json({ error: 'CDR API unreachable' }, { status: 502 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: pathSegments } = await params
  const path = '/' + pathSegments.join('/')
  const search = req.nextUrl.search
  try {
    const body = await req.text()
    const res = await fetch(`${CDR_API}${path}${search}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    return NextResponse.json({ error: 'CDR API unreachable' }, { status: 502 })
  }
}