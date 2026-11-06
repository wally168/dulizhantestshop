'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  CURRENCY_STORAGE_KEY, RATE_REFRESH_MS, formatConvertedPrice,
  isCurrencyCode, isExchangeRateSnapshot,
} from '@/lib/currencies'
import type { CurrencyCode, ExchangeRateSnapshot } from '@/lib/currencies'

interface CurrencyContextValue {
  currency: CurrencyCode
  snapshot: ExchangeRateSnapshot | null
  loading: boolean
  error: boolean
  setCurrency: (currency: CurrencyCode) => void
  refresh: () => void
  formatPrice: (priceUSD: number) => string
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null)

export default function CurrencyProvider({ children }: { children: ReactNode }) {
  // Keep the server render and first client render identical; restore preferences after mount.
  const [currency, setSelectedCurrency] = useState<CurrencyCode>('USD')
  const [snapshot, setSnapshot] = useState<ExchangeRateSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const preferredCurrency = useRef<CurrencyCode>('USD')
  const requestId = useRef(0)
  const lastRefresh = useRef(0)
  const invalidatePendingRequests = useCallback(() => { ++requestId.current }, [])

  const refresh = useCallback(async () => {
    const id = ++requestId.current
    setLoading(true)
    try {
      const response = await fetch('/api/exchange-rates', { signal: AbortSignal.timeout(10000) })
      if (!response.ok) throw new Error('Exchange rates unavailable')
      const data: unknown = await response.json()
      if (!isExchangeRateSnapshot(data)) throw new Error('Invalid exchange rates')
      if (id !== requestId.current) return
      setSnapshot(data)
      setSelectedCurrency(preferredCurrency.current)
      setError(false)
      lastRefresh.current = Date.now()
    } catch {
      if (id !== requestId.current) return
      // Never label an unconverted USD amount with a different currency.
      setSnapshot(null)
      setSelectedCurrency('USD')
      setError(true)
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CURRENCY_STORAGE_KEY)
      if (isCurrencyCode(saved)) preferredCurrency.current = saved
    } catch { /* Currency selection still works when storage is unavailable. */ }
    void refresh()
    const refreshIfNeeded = () => {
      if (Date.now() - lastRefresh.current >= RATE_REFRESH_MS) void refresh()
    }
    const interval = window.setInterval(refreshIfNeeded, RATE_REFRESH_MS)
    window.addEventListener('focus', refreshIfNeeded)
    const onStorage = (event: StorageEvent) => {
      if (event.key !== CURRENCY_STORAGE_KEY && event.key !== null) return
      preferredCurrency.current = isCurrencyCode(event.newValue) ? event.newValue : 'USD'
      // Refresh will restore the new preference once rates are available.
      setSelectedCurrency(current => preferredCurrency.current === 'USD' ? 'USD' : current)
      void refresh()
    }
    window.addEventListener('storage', onStorage)
    return () => {
      invalidatePendingRequests()
      window.clearInterval(interval)
      window.removeEventListener('focus', refreshIfNeeded)
      window.removeEventListener('storage', onStorage)
    }
  }, [refresh, invalidatePendingRequests])

  const setCurrency = (next: CurrencyCode) => {
    if (!isCurrencyCode(next) || (next !== 'USD' && !snapshot)) return
    preferredCurrency.current = next
    setSelectedCurrency(next)
    try { localStorage.setItem(CURRENCY_STORAGE_KEY, next) } catch { /* Optional persistence. */ }
  }

  const formatPrice = (priceUSD: number) => formatConvertedPrice(priceUSD, currency, snapshot?.rates[currency] ?? 1)

  return (
    <CurrencyContext.Provider value={{ currency, snapshot, loading, error, setCurrency, refresh, formatPrice }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  const context = useContext(CurrencyContext)
  if (!context) throw new Error('useCurrency requires CurrencyProvider')
  return context
}
