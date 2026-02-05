"use client"

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Tag, Save, Trash2 } from 'lucide-react'
import { useRouter, useParams } from 'next/navigation'

interface CategoryDetail {
  id: string
  name: string
  slug: string
  description?: string | null
  image?: string | null
}

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

export default function EditCategoryPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string

  const [data, setData] = useState<CategoryDetail | null>(null)
  const [i18n, setI18n] = useState<Record<string, I18nCategoryEntry>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/categories/${id}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('加载分类详情失败')
      const json = await res.json()
      setData(json)
      const parsedI18n = (() => {
        if (!json?.i18n) return {}
        if (typeof json.i18n === 'object') return json.i18n
        if (typeof json.i18n === 'string') {
          try {
            const parsed = JSON.parse(json.i18n)
            return parsed && typeof parsed === 'object' ? parsed : {}
          } catch { return {} }
        }
        return {}
      })()
      setI18n(parsedI18n as Record<string, I18nCategoryEntry>)
    } catch (e: any) {
      setError(e.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (id) load()
  }, [id, load])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!data) return
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
      const res = await fetch(`/api/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: data.name, slug: data.slug, description: data.description ?? null, image: data.image ?? null, i18n: i18nPayload }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || '更新分类失败')
      }
      router.push('/admin/categories')
    } catch (e: any) {
      setError(e.message || '更新分类失败')
    } finally {
      setSaving(false)
    }
  }

  const updateI18nField = (lang: string, field: keyof I18nCategoryEntry, value: string) => {
    setI18n((prev) => {
      const entry = prev[lang] ?? {}
      return { ...prev, [lang]: { ...entry, [field]: value } }
    })
  }

  const handleDelete = async () => {
    if (!confirm('确定要删除该分类吗？如果该分类下存在产品，将无法删除。')) return
    try {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || '删除分类失败')
      }
      router.push('/admin/categories')
    } catch (e: any) {
      alert(e.message || '删除失败')
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
              <span className="ml-2 text-xl font-semibold text-gray-900">编辑分类</span>
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
        {loading ? (
          <div className="bg-white p-6 rounded-xl shadow-sm border">加载中...</div>
        ) : error ? (
          <div className="bg-white p-6 rounded-xl shadow-sm border text-red-600">{error}</div>
        ) : data ? (
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">名称 *</label>
              <input
                type="text"
                value={data.name}
                onChange={(e) => setData({ ...data, name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Slug</label>
              <input
                type="text"
                value={data.slug}
                onChange={(e) => setData({ ...data, slug: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">唯一 URL 标识（如留空，保存时按名称自动生成）。</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">描述</label>
              <textarea
                value={data.description ?? ''}
                onChange={(e) => setData({ ...data, description: e.target.value })}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">封面图 URL</label>
              <input
                type="text"
                value={data.image ?? ''}
                onChange={(e) => setData({ ...data, image: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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

            <div className="flex justify-between">
              <button
                type="button"
                onClick={handleDelete}
                className="inline-flex items-center px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                <Trash2 className="h-5 w-5 mr-2" /> 删除分类
              </button>
              <button
                type="submit"
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                disabled={saving}
              >
                <Save className="h-5 w-5 mr-2" /> {saving ? '保存中...' : '保存修改'}
              </button>
            </div>
          </form>
        ) : (
          <div className="bg-white p-6 rounded-xl shadow-sm border">未找到分类</div>
        )}
      </div>
    </div>
  )
}
