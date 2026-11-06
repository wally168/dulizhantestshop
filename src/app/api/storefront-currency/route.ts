import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isCurrencyCode } from '@/lib/currencies'

export const dynamic = 'force-dynamic'

const headers = {
  'Cache-Control': 'no-store, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
}

export async function GET() {
  try {
    const setting = await db.siteSettings.findUnique({ where: { key: 'displayCurrency' }, select: { value: true } })
    return NextResponse.json({ currency: isCurrencyCode(setting?.value) ? setting.value : 'USD' }, { headers })
  } catch (error) {
    console.error('Failed to read storefront currency:', error)
    return NextResponse.json({ error: 'Currency setting unavailable' }, { status: 503, headers })
  }
}
