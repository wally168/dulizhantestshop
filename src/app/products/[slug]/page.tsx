export const revalidate = 3600;

import type { Metadata } from 'next'
import Layout from '@/components/Layout'
import ProductDetailClient from '@/components/ProductDetailClient'
import { db } from '@/lib/db'
import Link from 'next/link'
import { getProductUrlSegment, normalizeAsin } from '@/lib/utils'
import { headers } from 'next/headers'

function parseJson<T>(s: string | null | undefined, fallback: T): T {
  try { return s ? JSON.parse(s) as T : fallback } catch { return fallback }
}

async function getBaseUrl(): Promise<string> {
  try {
    const h = await headers()
    const host = h.get('host')
    const proto = h.get('x-forwarded-proto') || 'http'
    if (host) return `${proto}://${host}`
  } catch {}
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3005'
}

function normalizeImageUrl(url: string, baseUrl: string): string {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return `${baseUrl}${url.startsWith('/') ? url : `/${url}`}`
}

async function findProductBySlug(slug: string) {
  const normalizedSlugAsin = normalizeAsin(slug)
  const byAsin = normalizedSlugAsin
    ? await db.product.findUnique({
        where: { asin: normalizedSlugAsin },
        include: {
          category: true,
          brandRelation: true
        },
      })
    : null
  if (byAsin) return byAsin
  return db.product.findUnique({
    where: { slug },
    include: {
      category: true,
      brandRelation: true
    },
  })
}

export async function generateMetadata({ params }: { params: Promise<{ slug?: string | string[] }> }): Promise<Metadata> {
  const resolvedParams = await params
  const slugParam = Array.isArray(resolvedParams?.slug) ? resolvedParams.slug[0] : resolvedParams?.slug
  const slug = typeof slugParam === 'string' ? slugParam : undefined
  if (!slug) return {}

  try {
    const product = await findProductBySlug(slug)
    if (!product || !product.active) return {}

    const baseUrl = await getBaseUrl()
    const productPath = `/products/${getProductUrlSegment(product)}`
    const productUrl = `${baseUrl}${productPath}`
    const title = product.title || 'Product'
    const description = (product.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160)
    const parsedImages = parseJson<string[]>(product.images, [product.mainImage])
    const images = (Array.isArray(parsedImages) ? parsedImages : [product.mainImage])
      .filter(Boolean)
      .slice(0, 5)
      .map((u) => normalizeImageUrl(u, baseUrl))

    return {
      title,
      description,
      alternates: {
        canonical: productUrl,
      },
      openGraph: {
        title,
        description,
        type: 'website',
        url: productUrl,
        images: images.map((u) => ({ url: u, alt: title })),
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images,
      },
    }
  } catch {
    return {}
  }
}

export default async function ProductDetail({ params }: { params: Promise<{ slug?: string | string[] }> }) {
  const resolvedParams = await params
  const slugParam = Array.isArray(resolvedParams?.slug) ? resolvedParams.slug[0] : resolvedParams?.slug
  const slug = typeof slugParam === 'string' ? slugParam : undefined

  if (!slug) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto px-4 py-16">
          <p className="text-gray-600">Product not found</p>
          <Link href="/products" className="text-blue-600 hover:text-blue-700 mt-2 inline-block">
            Back to products
          </Link>
        </div>
      </Layout>
    )
  }

  // Safely attempt to fetch product; fall back to null if DB is misconfigured
  const product = await (async () => {
    try {
      return await findProductBySlug(slug)
    } catch (e) {
      console.error('Failed to load product:', e)
      return null
    }
  })()

  if (!product || !product.active) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto px-4 py-16">
          <p className="text-gray-600">Product not found</p>
          <Link href="/products" className="text-blue-600 hover:text-blue-700 mt-2 inline-block">
            Back to products
          </Link>
        </div>
      </Layout>
    )
  }

  const parsedImages = parseJson<string[]>(product.images, [product.mainImage])
  const images = Array.isArray(parsedImages) ? parsedImages : [product.mainImage]
  const parsedBullets = parseJson<string[]>(product.bulletPoints, [])
  const bullets = Array.isArray(parsedBullets) ? parsedBullets : []

  type VariantGroup = { name: string; options: string[] }
  // 优先使用关联品牌的名称，回退到旧字段
  const brand = (product as any).brandRelation?.name ?? product.brand ?? null
  const upc = product.upc ?? null
  const asin = (product as { asin?: string | null }).asin ?? null
  const material = product.material ?? null
  const itemDimensions = product.itemDimensions ?? null
  const color = product.color ?? null
  const style = product.style ?? null
  const itemWeight = product.itemWeight ?? null
  const modelNumber = product.modelNumber ?? null
  const modelName = product.modelName ?? null
  const itemTypeName = product.itemTypeName ?? null
  const manufacturer = product.manufacturer ?? null
  const pattern = product.pattern ?? null
  const size = product.size ?? null
  const showAsinOnFrontend = (product as { showAsinOnFrontend?: boolean | null }).showAsinOnFrontend === true
  const publishedAt = product.publishedAt ?? null
  const youtubeUrl = (product as { youtubeUrl?: string | null }).youtubeUrl ?? null
  const youtubeIndex = (product as { youtubeIndex?: number | null }).youtubeIndex ?? null
  const variantGroups = parseJson<VariantGroup[]>(product.variants, [])
  const variantImageMap = (() => {
    try {
      const raw = product.variantImageMap
      if (!raw) return null
      const obj = JSON.parse(raw)
      return obj && typeof obj === 'object' ? obj : null
    } catch { return null }
  })()
  const variantOptionImages = (() => {
    try {
      const raw = product.variantOptionImages
      if (!raw) return null
      const obj = JSON.parse(raw)
      return obj && typeof obj === 'object' ? obj : null
    } catch { return null }
  })()
  const variantOptionLinks = (() => {
    try {
      const raw = product.variantOptionLinks
      if (!raw) return null
      const obj = JSON.parse(raw)
      return obj && typeof obj === 'object' ? obj : null
    } catch { return null }
  })()
  const variantOptionPrices = (() => {
    try {
      const raw = (product as { variantOptionPrices?: string | null }).variantOptionPrices
      if (!raw) return null
      const obj = JSON.parse(raw)
      if (obj && typeof obj === 'object' && (obj as any).__original_price_map__) {
        delete (obj as any).__original_price_map__
      }
      if (obj && typeof obj === 'object' && (obj as any).__title_map__) {
        delete (obj as any).__title_map__
      }
      return obj && typeof obj === 'object' ? obj : null
    } catch { return null }
  })()
  const variantOptionOriginalPrices = (() => {
    try {
      const raw = (product as { variantOptionOriginalPrices?: string | null }).variantOptionOriginalPrices
      if (raw) {
        const obj = JSON.parse(raw)
        return obj && typeof obj === 'object' ? obj : null
      }
      const pricesRaw = (product as { variantOptionPrices?: string | null }).variantOptionPrices
      if (!pricesRaw) return null
      const pricesObj = JSON.parse(pricesRaw)
      const fallback = pricesObj?.__original_price_map__
      return fallback && typeof fallback === 'object' ? fallback : null
    } catch { return null }
  })()
  const variantOptionTitles = (() => {
    try {
      const raw = (product as { variantOptionTitles?: string | null }).variantOptionTitles
      if (raw) {
        const obj = JSON.parse(raw)
        return obj && typeof obj === 'object' ? obj : null
      }
      const pricesRaw = (product as { variantOptionPrices?: string | null }).variantOptionPrices
      if (!pricesRaw) return null
      const pricesObj = JSON.parse(pricesRaw)
      const fallback = pricesObj?.__title_map__
      return fallback && typeof fallback === 'object' ? fallback : null
    } catch { return null }
  })()

  const reviews = await (async () => {
    try {
      const list = await db.productReview.findMany({
        where: { productId: product.id, isVisible: true },
        orderBy: { createdAt: 'desc' },
      })
      return list.map(r => ({
        id: r.id,
        name: r.name || '',
        country: r.country || '',
        title: r.title || '',
        content: r.content,
        rating: r.rating,
        images: parseJson<string[]>(r.images, []),
        createdAt: r.createdAt,
      }))
    } catch { return [] }
  })()

  const baseUrl = await getBaseUrl()
  const productPath = `/products/${getProductUrlSegment(product)}`
  const productUrl = `${baseUrl}${productPath}`
  const imageUrls = images
    .filter(Boolean)
    .slice(0, 10)
    .map((u) => normalizeImageUrl(u, baseUrl))
  const plainDescription = (product.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: plainDescription,
    image: imageUrls,
    sku: product.slug,
    ...(asin ? { gtin: asin } : {}),
    ...(brand ? { brand: { '@type': 'Brand', name: brand } } : {}),
    offers: {
      '@type': 'Offer',
      url: productUrl,
      priceCurrency: 'USD',
      price: String(product.price),
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
    },
  }

  return (
    <Layout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <div className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <ProductDetailClient
            id={product.id}
            slug={getProductUrlSegment(product)}
            title={product.title}
            categoryName={product.category?.name ?? 'Uncategorized'}
            brand={brand ?? null}
            upc={upc ?? null}
            asin={showAsinOnFrontend ? asin : null}
            material={material}
            itemDimensions={itemDimensions}
            color={color}
            style={style}
            itemWeight={itemWeight}
            modelNumber={modelNumber}
            modelName={modelName}
            itemTypeName={itemTypeName}
            manufacturer={manufacturer}
            pattern={pattern}
            size={size}
            publishedAt={publishedAt ?? null}
            description={product.description}
            amazonUrl={product.amazonUrl}
            price={product.price}
            originalPrice={product.originalPrice ?? null}
            images={images}
            mainImage={product.mainImage}
            youtubeUrl={youtubeUrl}
            youtubeIndex={youtubeIndex}
            bullets={bullets}
            variantGroups={Array.isArray(variantGroups) ? variantGroups : []}
            variantImageMap={variantImageMap}
            variantOptionImages={variantOptionImages}
            variantOptionLinks={variantOptionLinks}
            variantOptionPrices={variantOptionPrices}
            variantOptionOriginalPrices={variantOptionOriginalPrices}
            variantOptionTitles={variantOptionTitles}
            showBuyOnAmazon={(product.showBuyOnAmazon !== false)}
            showAddToCart={(product.showAddToCart !== false)}
            reviews={reviews}
          />
        </div>
      </div>
    </Layout>
  )
}
