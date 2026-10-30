'use client'

import { DEFAULT_BUY_BUTTON_TEXT, MAX_BUY_BUTTON_TEXT_LENGTH } from '@/lib/purchase-button'

export default function BuyButtonTextField({ value, onChange }: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="mt-4 max-w-lg">
      <label htmlFor="buyButtonText" className="block text-sm font-medium text-gray-700 mb-2">
        购买按钮文案（可选）
      </label>
      <input
        id="buyButtonText"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={MAX_BUY_BUTTON_TEXT_LENGTH}
        placeholder={DEFAULT_BUY_BUTTON_TEXT}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        aria-describedby="buyButtonTextHelp"
      />
      <p id="buyButtonTextHelp" className="text-xs text-gray-500 mt-1">
        留空默认显示 Buy on Amazon；可填写 Buy on Walmart 等文案，并在购买跳转链接中填写对应平台地址。最多 {MAX_BUY_BUTTON_TEXT_LENGTH} 个字符。
      </p>
    </div>
  )
}
