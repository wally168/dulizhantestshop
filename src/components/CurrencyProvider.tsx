'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { RATE_REFRESH_MS, formatConvertedPrice, isCurrencyCode, isExchangeRateSnapshot } from '@/lib/currencies'
import type { CurrencyCode, ExchangeRateSnapshot } from '@/lib/currencies'

interface CurrencyContextValue {
  currency: CurrencyCode
  snapshot: ExchangeRateSnapshot | null
  loading: boolean
  error: boolean
  refresh: () => void
  formatPrice: (priceUSD: number) => string
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null)

export default function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<CurrencyCode>('USD')
  const [snapshot, setSnapshot] = useState<ExchangeRateSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const cachedRates = useRef<ExchangeRateSnapshot | null>(null)
  const lastRateRefresh = useRef(0)
  const inFlight = useRef(false)
  const generation = useRef(0)
  const invalidate = useCallback(() => { ++generation.current; inFlight.current = false }, [])

  const refresh = useCallback(async () => {
    if (inFlight.current) return
    inFlight.current = true
    const current = generation.current
    const active = () => current === generation.current
    setLoading(true)
    try {
      const response = await fetch('/api/storefront-currency', { cache: 'no-store', signal: AbortSignal.timeout(5000) })
      if (!response.ok) throw new Error('Currency settings unavailable')
      const config = await response.json()
      if (!isCurrencyCode(config.currency)) throw new Error('Invalid currency setting')
      if (!active()) return
      if (config.currency === 'USD') {
        setCurrency('USD')
        setError(false)
        return
      }
      try {
        let rates = cachedRates.current
        if (!rates || Date.now() - lastRateRefresh.current >= RATE_REFRESH_MS) {
          const rateResponse = await fetch('/api/exchange-rates', { signal: AbortSignal.timeout(10000) })
          if (!rateResponse.ok) throw new Error('Exchange rates unavailable')
          const data: unknown = await rateResponse.json()
          if (!isExchangeRateSnapshot(data)) throw new Error('Invalid exchange rates')
          if (!active()) return
          rates = data
          cachedRates.current = rates
          lastRateRefresh.current = Date.now()
        }
        setSnapshot(rates)
        setCurrency(config.currency)
        setError(false)
      } catch {
        if (!active()) return
        cachedRates.current = null
        setSnapshot(null)
        setCurrency('USD')
        setError(true)
      }
    } catch {
      // Keep the last confirmed setting when synchronization is temporarily unavailable.
      if (active()) setError(true)
    } finally {
      if (active()) { inFlight.current = false; setLoading(false) }
    }
  }, [])

  useEffect(() => {
    void refresh()
    const sync = () => { if (document.visibilityState !== 'hidden') void refresh() }
    const interval = window.setInterval(sync, 3000)
    window.addEventListener('focus', sync)
    document.addEventListener('visibilitychange', sync)
    return () => {
      invalidate()
      window.clearInterval(interval)
      window.removeEventListener('focus', sync)
      document.removeEventListener('visibilitychange', sync)
    }
  }, [refresh, invalidate])

  const formatPrice = (priceUSD: number) => formatConvertedPrice(priceUSD, currency, snapshot?.rates[currency] ?? 1)
  return (
    <CurrencyContext.Provider value={{ currency, snapshot, loading, error, refresh, formatPrice }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  const context = useContext(CurrencyContext)
  if (!context) throw new Error('useCurrency requires CurrencyProvider')
  return context
}
