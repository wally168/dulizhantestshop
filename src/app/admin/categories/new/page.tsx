"use client"

import Link from 'next/link'
import { useState } from 'react'
import { ArrowLeft, Tag, Save } from 'lucide-react'
import { useRouter } from 'next/navigation'

type I18nCategoryEntry = {
  name?: string
  description?: string
}

const languageOptions = [
  { value: 'en', label: 'English' },
  { value: 'zh', label: '中文' },
  { value: 'ja', label: '日本語' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'ko', label: '한국어' },
]

export default function NewCategoryPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [image, setImage] = useState('')
  const [i18n, setI18n] = useState<Record<string, I18nCategoryEntry>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateI18nField = (lang: string, field: keyof I18nCategoryEntry, value: string) => {
    setI18n((prev) => {
      const entry = prev[lang] ?? {}
      return { ...prev, [lang]: { ...entry, [field]: value } }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const i18nPayload = (() => {
        const result: Record<string, I18nCategoryEntry> = {}
        languageOptions.forEach((lang) => {
          const entry = i18n[lang.value]
          if (!entry) return
          const nameValue = (entry.name ?? '').trim()
          const descValue = (entry.description ?? '').trim()
          if (nameValue || descValue) {
            result[lang.value] = {
              ...(nameValue ? { name: nameValue } : {}),
              ...(descValue ? { description: descValue } : {}),
            }
          }
        })
        return result
      })()
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug, description: description || null, image: image || null, i18n: i18nPayload }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || '创建分类失败')
      }
      router.push('/admin/categories')
    } catch (e: any) {
      setError(e.message || '创建分类失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-md shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/admin/categories" className="text-gray-600 hover:text-blue-600 mr-4">
                <ArrowLeft className="h-6 w-6" />
              </Link>
              <Tag className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-semibold text-gray-900">添加分类</span>
            </div>
            <Link
              href="/admin/categories"
              className="text-gray-600 hover:text-blue-600 transition-colors"
            >
              返回分类管理
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border space-y-6">
          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">名称 *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="例如：Audio"
              required
            />
            <p className="text-xs text-gray-500 mt-1">用于显示的分类名称</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Slug</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="留空将根据名称自动生成"
            />
            <p className="text-xs text-gray-500 mt-1">URL 标识（唯一）。如留空，将按名称自动生成。</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              rows={3}
              placeholder="可选"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">封面图 URL</label>
            <input
              type="text"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="可选"
            />
          </div>

          <div className="border rounded-lg p-4">
            <div className="text-sm font-semibold text-gray-900 mb-4">多语言内容</div>
            <div className="space-y-4">
              {languageOptions.map((lang) => {
                const entry = i18n[lang.value] ?? {}
                return (
                  <div key={lang.value} className="border rounded-lg p-4">
                    <div className="text-sm font-semibold text-gray-900 mb-3">{lang.label}</div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">分类名称</label>
                        <input
                          type="text"
                          value={entry.name ?? ''}
                          onChange={(e) => updateI18nField(lang.value, 'name', e.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">分类描述</label>
                        <textarea
                          rows={3}
                          value={entry.description ?? ''}
                          onChange={(e) => updateI18nField(lang.value, 'description', e.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              disabled={saving}
            >
              <Save className="h-5 w-5 mr-2" /> {saving ? '保存中...' : '保存分类'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
