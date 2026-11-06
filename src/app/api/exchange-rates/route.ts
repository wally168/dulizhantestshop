import { NextResponse } from 'next/server'
import { CURRENCIES, parseExchangeRates } from '@/lib/currencies'

export async function GET() {
  try {
    const quotes = CURRENCIES.filter(({ code }) => code !== 'USD').map(({ code }) => code).join(',')
    const response = await fetch(`https://api.frankfurter.dev/v2/rates?base=USD&quotes=${quotes}`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) throw new Error(`Exchange rate provider returned ${response.status}`)
    const snapshot = parseExchangeRates(await response.json())
    return NextResponse.json(snapshot, {
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=3600' },
    })
  } catch (error) {
    console.error('Failed to fetch exchange rates:', error)
    return NextResponse.json({ error: 'Exchange rates are temporarily unavailable' }, {
      status: 503,
      headers: { 'Cache-Control': 'no-store' },
    })
  }
}
