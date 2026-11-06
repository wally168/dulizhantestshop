'use client'

import { CURRENCIES, isCurrencyCode } from '@/lib/currencies'
import { useCurrency } from './CurrencyProvider'

export default function CurrencySelector() {
  const { currency, snapshot, loading, setCurrency } = useCurrency()
  return (
    <select
      aria-label="Display currency"
      aria-busy={loading}
      title={loading ? 'Loading exchange rates…' : 'Choose display currency'}
      value={currency}
      onChange={event => { if (isCurrencyCode(event.target.value)) setCurrency(event.target.value) }}
      className="w-20 shrink-0 rounded-lg border border-gray-200 bg-white px-1 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-blue-500"
    >
      {CURRENCIES.map(({ code, name }) => (
        <option key={code} value={code} disabled={code !== 'USD' && !snapshot} title={name}>
          {code}
        </option>
      ))}
    </select>
  )
}

export function CurrencyNotice() {
  const { currency, snapshot, error, loading, refresh } = useCurrency()
  if (error) return (
    <div role="status" className="bg-amber-50 px-4 py-2 text-center text-xs text-amber-900">
      Currency conversion is temporarily unavailable. Prices are shown in USD.{' '}
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
