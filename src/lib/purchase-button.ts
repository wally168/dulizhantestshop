export const DEFAULT_BUY_BUTTON_TEXT = 'Buy on Amazon'
export const MAX_BUY_BUTTON_TEXT_LENGTH = 80

export function normalizeBuyButtonText(value: unknown): string {
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : DEFAULT_BUY_BUTTON_TEXT
}
