'use client'

import { useCurrency } from './CurrencyProvider'

export function CurrencyNotice() {
  const { currency, snapshot, error, loading, refresh } = useCurrency()
  if (error) return (
    <div role="status" className="bg-amber-50 px-4 py-2 text-center text-xs text-amber-900">
      Currency updates are temporarily unavailable. Prices are shown in {currency}.{' '}
      <button type="button" onClick={refresh} disabled={loading} className="underline disabled:opacity-50">
        {loading ? 'Loading…' : 'Retry'}
      </button>
    </div>
  )
  if (currency === 'USD' || !snapshot) return null
  return (
    <div role="status" className="bg-blue-50 px-4 py-2 text-center text-xs text-blue-900">
      Estimated prices in {currency}. Rates as of {snapshot.date} via{' '}
      <a href="https://frankfurter.dev" target="_blank" rel="noopener noreferrer" className="underline">Frankfurter</a>.
      {' '}Final price and currency are determined by the purchase platform.
    </div>
  )
}
