import Layout from '@/components/Layout'
import ProductDetailClient from '@/components/ProductDetailClient'
import { db } from '@/lib/db'
import Link from 'next/link'
import { formatPrice } from '@/lib/utils'
import type { ProductReview } from '@prisma/client'

function parseJson<T>(s: string | null | undefined, fallback: T): T {
  try { return s ? JSON.parse(s) as T : fallback } catch { return fallback }
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
      return await db.product.findUnique({
        where: { slug },
        include: { category: true },
      })
    } catch (e) {
      console.error('Failed to load product:', e)
      return null
    }
  })()

  if (!product) {
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
  const brand = product.brand ?? null
  const upc = product.upc ?? null
  const publishedAt = product.publishedAt ?? null
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

  return (
    <Layout>
      <div className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <ProductDetailClient
            id={product.id}
            slug={product.slug}
            title={product.title}
            categoryName={product.category?.name ?? 'Uncategorized'}
            brand={brand ?? null}
            upc={upc ?? null}
            publishedAt={publishedAt ?? null}
            description={product.description}
            amazonUrl={product.amazonUrl}
            price={product.price}
            originalPrice={product.originalPrice ?? null}
            images={images}
            mainImage={product.mainImage}
            bullets={bullets}
            variantGroups={Array.isArray(variantGroups) ? variantGroups : []}
            variantImageMap={variantImageMap}
            variantOptionImages={variantOptionImages}
            variantOptionLinks={variantOptionLinks}
            showBuyOnAmazon={(product.showBuyOnAmazon !== false)}
            showAddToCart={(product.showAddToCart !== false)}
            reviews={reviews}
          />
        </div>
      </div>
    </Layout>
  )
}
