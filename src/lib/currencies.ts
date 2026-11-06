export const CURRENCIES = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'NZD', name: 'New Zealand Dollar' },
  { code: 'CHF', name: 'Swiss Franc' },
  { code: 'SGD', name: 'Singapore Dollar' },
  { code: 'HKD', name: 'Hong Kong Dollar' },
  { code: 'CNY', name: 'Chinese Yuan' },
] as const

export type CurrencyCode = typeof CURRENCIES[number]['code']
export type ExchangeRates = Record<CurrencyCode, number>
export interface ExchangeRateSnapshot {
  base: 'USD'
  date: string
  rates: ExchangeRates
}

export const RATE_REFRESH_MS = 60 * 60 * 1000

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return CURRENCIES.some(currency => currency.code === value)
}

// Validate every supported quote before exposing a complete conversion snapshot.
export function parseExchangeRates(input: unknown): ExchangeRateSnapshot {
  if (!Array.isArray(input)) throw new Error('Invalid exchange rate response')
  const rates: Partial<ExchangeRates> = { USD: 1 }
  const dates: string[] = []
  for (const row of input) {
    const quote: unknown = row?.quote
    if (!row || row.base !== 'USD' || !isCurrencyCode(quote) || quote === 'USD') continue
    if (typeof row.rate !== 'number' || !Number.isFinite(row.rate) || row.rate <= 0) {
      throw new Error('Invalid exchange rate')
    }
    if (typeof row.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(row.date) || !Number.isFinite(Date.parse(row.date))) {
      throw new Error('Invalid exchange rate date')
    }
    rates[quote] = row.rate
    dates.push(row.date)
  }
  if (CURRENCIES.some(({ code }) => !rates[code])) throw new Error('Missing exchange rates')
  return { base: 'USD', date: dates.sort()[0], rates: rates as ExchangeRates }
}

export function isExchangeRateSnapshot(input: unknown): input is ExchangeRateSnapshot {
  if (!input || typeof input !== 'object') return false
  const snapshot = input as Partial<ExchangeRateSnapshot>
  return snapshot.base === 'USD' && typeof snapshot.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(snapshot.date) && Number.isFinite(Date.parse(snapshot.date)) &&
    snapshot.rates?.USD === 1 && CURRENCIES.every(({ code }) => {
      const rate = snapshot.rates?.[code]
      return typeof rate === 'number' && Number.isFinite(rate) && rate > 0
    })
}

export function formatConvertedPrice(priceUSD: number, currency: CurrencyCode, rate = 1): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    // Explicit codes distinguish USD, AUD, CAD, NZD, SGD and HKD.
    currencyDisplay: 'code',
  }).format(priceUSD * rate)
}
