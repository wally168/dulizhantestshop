'use client'

import { useCurrency } from './CurrencyProvider'

export function CurrencyNotice() {
  const { currency, error, loading, refresh } = useCurrency()
  if (error) return (
    <div role="status" className="bg-amber-50 px-4 py-2 text-center text-xs text-amber-900">
      Currency updates are temporarily unavailable. Prices are shown in {currency}.{' '}
      <button type="button" onClick={refresh} disabled={loading} className="underline disabled:opacity-50">
        {loading ? 'Loading…' : 'Retry'}
      </button>
    </div>
  )
  return null
}
