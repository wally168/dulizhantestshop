import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { headers } from 'next/headers'
import { getProductUrlSegment } from '@/lib/utils'

async function getBaseUrl(): Promise<string> {
  try {
    const h = await headers()
    const host = h.get('host')
    const proto = h.get('x-forwarded-proto') || 'http'
    if (host) return `${proto}://${host}`
  } catch {}
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3005'
}

async function getSettings(): Promise<Record<string, string>> {
  const defaults: Record<string, string> = {
    sitemapEnabled: 'true',
    sitemapIncludeProducts: 'true',
    sitemapIncludeCategories: 'true',
    sitemapChangefreq: 'daily',
    sitemapPriority: '0.7',
  }
  try {
    const rows = await db.siteSettings.findMany()
    for (const r of rows) defaults[r.key] = r.value
  } catch {}
  return defaults
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function GET() {
  const settings = await getSettings()
  if (settings.sitemapEnabled !== 'true') {
    return new NextResponse('Sitemap disabled', { status: 404 })
  }

  const baseUrl = await getBaseUrl()
  const urls: Array<{
    loc: string
    lastmod?: string
    changefreq?: string
    priority?: string
    images?: Array<{ loc: string; title?: string }>
  }> = []

  const add = (path: string, lastmod?: Date, images?: Array<{ loc: string; title?: string }>) => {
    urls.push({
      loc: `${baseUrl}${path}`,
      lastmod: lastmod ? lastmod.toISOString() : undefined,
      changefreq: settings.sitemapChangefreq,
      priority: settings.sitemapPriority,
      images,
    })
  }

  add('/')
  add('/products')
  add('/about')
  add('/contact')

  if (settings.sitemapIncludeCategories === 'true') {
    try {
      const categories = await db.category.findMany({ select: { slug: true, updatedAt: true } })
      for (const c of categories) add(`/categories/${c.slug}`, c.updatedAt)
    } catch {}
  }

  if (settings.sitemapIncludeProducts === 'true') {
    try {
      const products = await db.product.findMany({
        where: { active: true },
        select: { slug: true, asin: true, title: true, mainImage: true, images: true, updatedAt: true }
      })
      for (const p of products) {
        const rawImages = (() => {
          try {
            return p.images ? JSON.parse(p.images) : []
          } catch {
            return []
          }
        })()
        const allImages = [p.mainImage, ...(Array.isArray(rawImages) ? rawImages : [])]
          .filter((u, idx, arr) => typeof u === 'string' && u.trim() && arr.indexOf(u) === idx)
          .slice(0, 10)
          .map((u) => ({
            loc: u.startsWith('http') ? u : `${baseUrl}${u.startsWith('/') ? u : `/${u}`}`,
            title: p.title,
          }))
        add(`/products/${getProductUrlSegment(p)}`, p.updatedAt, allImages)
      }
    } catch {}
  }

  const xmlItems = urls.map(u => {
    return `  <url>\n    <loc>${escapeXml(u.loc)}</loc>`
      + (u.lastmod ? `\n    <lastmod>${escapeXml(u.lastmod)}</lastmod>` : '')
      + (u.changefreq ? `\n    <changefreq>${u.changefreq}</changefreq>` : '')
      + (u.priority ? `\n    <priority>${u.priority}</priority>` : '')
      + (u.images && u.images.length > 0
        ? `\n${u.images.map((img) => {
            return `    <image:image>\n      <image:loc>${escapeXml(img.loc)}</image:loc>${img.title ? `\n      <image:title>${escapeXml(img.title)}</image:title>` : ''}\n    </image:image>`
          }).join('\n')}`
        : '')
      + `\n  </url>`
  }).join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${xmlItems}\n</urlset>`
  return new NextResponse(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' }
  })
}

