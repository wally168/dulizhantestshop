import Link from 'next/link'
import Layout from '@/components/Layout'
import { db } from '@/lib/db'
import { formatPrice, getLocale, getTranslations, normalizeLanguage, type SupportedLanguage } from '@/lib/utils'
import { cookies } from 'next/headers'
import AddToCartButton from '@/components/AddToCartButton'
import FallbackImage from '@/components/FallbackImage'
import type { Product } from '@prisma/client'

export default async function ProductsPage({ searchParams }: { searchParams?: Promise<{ categoryId?: string; q?: string }> }) {
  const cookieStore = await cookies()
  const cookieLang = cookieStore.get('siteLanguage')?.value
  const language = cookieLang
    ? normalizeLanguage(cookieLang)
    : await (async (): Promise<SupportedLanguage> => {
        try {
          const row = await db.siteSettings.findFirst({ where: { key: 'language' } })
          if (row?.value) return normalizeLanguage(row.value)
        } catch {}
        return 'en'
      })()
  const t = getTranslations(language)
  const locale = getLocale(language)
  const resolvedParams = searchParams ? await searchParams : {}
  const selectedCategoryId = resolvedParams?.categoryId || ''
  const q = resolvedParams?.q || ''
  let products: Product[] = []
  try {
    const where: any = { active: true }
    if (selectedCategoryId) where.categoryId = selectedCategoryId
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ]
    }
    products = await db.product.findMany({
      where,
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'desc' },
      ],
    })
  } catch (e) {
    console.error('Failed to load products:', e)
    products = []
  }

  let aggMap: Record<string, { avgRating: number; reviewCount: number }> = {}
  try {
    const ids = products.map((p) => p.id)
    if (ids.length > 0) {
      const groups = await (db as any).productReview.groupBy({
        by: ['productId'],
        where: { productId: { in: ids }, isVisible: true },
        _avg: { rating: true },
        _count: { _all: true },
      })
      aggMap = Object.fromEntries(groups.map((g: any) => [
        g.productId,
        {
          avgRating: typeof g._avg?.rating === 'number' ? Math.round(g._avg.rating * 10) / 10 : 0,
          reviewCount: typeof g._count?._all === 'number' ? g._count._all : 0,
        }
      ]))
    }
  } catch (e) {
    console.error('Failed to aggregate reviews:', e)
  }

  const resolveImage = (p: Product): string => {
    const main = (p?.mainImage ?? '').trim()
    if (main) return main
    try {
      const arr = JSON.parse(p?.images ?? '[]')
      if (Array.isArray(arr) && arr.length > 0) {
        const first = (arr[0] ?? '').trim()
        if (first) return first
      }
    } catch {}
    return 'https://placehold.co/600x600?text=No+Image'
  }

  return (
    <Layout>
      <div className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              {t.products.title}
            </h1>
            <p className="mx-auto mt-4 max-w-3xl text-lg text-gray-600">
              {t.products.subtitle}
            </p>
          </div>

          {/* Filter bar */}
          <div className="mt-10 flex items-center justify-center">
            <form method="get" action="/products" className="flex items-center gap-3">
              <select name="categoryId" defaultValue={selectedCategoryId} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="">{t.products.allCategories}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {q && <input type="hidden" name="q" value={q} />}
              <button type="submit" className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 text-sm hover:bg-gray-300">{t.products.apply}</button>
            </form>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:gap-x-8">
            {products.map((product) => {
              const displayImage = resolveImage(product)
              const price = Number(product?.price ?? 0)
              const hasOriginal = typeof product?.originalPrice === 'number' && Number(product.originalPrice) > price
              const amazonUrl = typeof product?.amazonUrl === 'string' ? product.amazonUrl : ''
              const showBuy = product.showBuyOnAmazon !== false && !!amazonUrl
              const showAdd = product.showAddToCart !== false
              const avgRating = aggMap[product.id]?.avgRating ?? 0
              const reviewCount = aggMap[product.id]?.reviewCount ?? 0

              return (
                <div key={product.id} className="group relative">
                  <div className="aspect-square w-full overflow-hidden rounded-lg bg-gray-100">
                    <FallbackImage
                      src={displayImage}
                      alt={product.title || t.products.productImage}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="mt-4 flex justify-between">
                    <div className="flex-1">
                      <h3 className="relative text-sm text-gray-700">
                        <Link href={`/products/${product.slug}`}>
                          <span aria-hidden="true" className="absolute inset-0" />
                          {product.title || t.products.untitledProduct}
                        </Link>
                      </h3>
                      {reviewCount > 0 && (
                        <div className="mt-1 flex items-center gap-2 text-sm">
                          <span className="text-gray-900 font-medium">{avgRating.toFixed(1)}</span>
                          <span className="flex items-center">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <span key={i} className={i < Math.round(avgRating) ? 'text-yellow-500' : 'text-gray-300'}>★</span>
                            ))}
                          </span>
                          <span className="text-gray-600">({reviewCount})</span>
                        </div>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <p className="text-lg font-medium text-gray-900">
                          {formatPrice(price, locale)}
                        </p>
                        {hasOriginal && (
                          <p className="text-sm text-gray-500 line-through">
                            {formatPrice(Number(product.originalPrice), locale)}
                          </p>
                        )}
                      </div>
                      <div className="mt-4 flex items-center gap-2">
                        <Link
                          href={`/products/${product.slug}`}
                          className="inline-flex items-center justify-center px-3 py-2 rounded-md bg-orange-600 text-white text-sm font-semibold leading-tight text-center hover:bg-orange-500"
                        >
                          {t.common.viewDetails}
                        </Link>
                        {showBuy && (
                          <a
                            href={amazonUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center px-3 py-2 rounded-md bg-blue-600 text-white text-sm font-semibold leading-tight text-center hover:bg-blue-500"
                          >
                            {t.common.buyOnAmazon}
                          </a>
                        )}
                        {showAdd && (
                          <div className="flex items-center">
                            <AddToCartButton
                              id={product.id}
                              slug={product.slug}
                              title={product.title}
                              price={price}
                              imageUrl={resolveImage(product)}
                              size="sm"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {products.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">{t.products.emptyTitle}</p>
              <p className="text-gray-400 text-sm mt-2">{t.products.emptySubtitle}</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
  // 类别列表
  let categories: Array<{ id: string; name: string }> = []
  try {
    const rows = await db.category.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } })
    categories = rows
  } catch {}
