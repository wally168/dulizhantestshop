'use client'

import { useCurrency } from './CurrencyProvider'

// Always receive the original USD amount, including for cart line items and totals.
export default function Price({ amount }: { amount: number }) {
  const { formatPrice } = useCurrency()
  return <>{formatPrice(amount)}</>
}
