import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isSameOrigin, requireAdminSession } from '@/lib/auth'
type ReviewRecord = {
  id: string
  productId: string
  isVisible: boolean
  country: string | null
  name: string | null
  title: string | null
  content: string
  rating: number
  images: string | null
  createdAt: Date
  updatedAt: Date
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const url = new URL(request.url)
    const visibleOnly = url.searchParams.get('visibleOnly') !== '0'
    const rawPage = Number(url.searchParams.get('page') || '1')
    const rawPageSize = Number(url.searchParams.get('pageSize') || '20')
    const pageSize = Number.isFinite(rawPageSize) ? Math.max(1, Math.min(rawPageSize, 100)) : 20
    if (!visibleOnly) {
      const { response } = await requireAdminSession(request)
      if (response) return response
    }

    const where = { productId: id, ...(visibleOnly ? { isVisible: true } : {}) }

    if (!visibleOnly) {
      const total = await db.productReview.count({ where })
      const totalPages = Math.max(1, Math.ceil(total / pageSize))
      const page = Number.isFinite(rawPage) ? Math.min(Math.max(1, rawPage), totalPages) : 1
      const reviews = await db.productReview.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      })

      const items = reviews.map((r: ReviewRecord) => ({
        id: r.id,
        productId: r.productId,
        isVisible: r.isVisible,
        country: r.country || '',
        name: r.name || '',
        title: r.title || '',
        content: r.content,
        rating: r.rating,
        images: (() => { try { return r.images ? JSON.parse(r.images) : [] } catch { return [] } })(),
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      }))

      return NextResponse.json({
        items,
        total,
        page,
        pageSize,
        totalPages,
      })
    }

    const reviews = await db.productReview.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    const result = reviews.map((r: ReviewRecord) => ({
      id: r.id,
      productId: r.productId,
      isVisible: r.isVisible,
      country: r.country || '',
      name: r.name || '',
      title: r.title || '',
      content: r.content,
      rating: r.rating,
      images: (() => { try { return r.images ? JSON.parse(r.images) : [] } catch { return [] } })(),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }))

    const res = NextResponse.json(result)
    if (visibleOnly) {
      res.headers.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600')
    }
    return res
  } catch (error) {
    console.error('获取评论失败:', error)
    return NextResponse.json({ error: '获取评论失败' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: '非法来源' }, { status: 403 })
    }
    const { response } = await requireAdminSession(request)
    if (response) return response

    const { id: productId } = await context.params
    const body = await request.json().catch(() => ({}))
    const mode = body?.mode === 'all' ? 'all' : 'selected'
    const ids = Array.isArray(body?.ids) ? body.ids.map((item: unknown) => String(item)).filter(Boolean) : []

    let result
    if (mode === 'all') {
      result = await db.productReview.deleteMany({
        where: { productId },
      })
    } else {
      if (ids.length === 0) {
        return NextResponse.json({ error: '请选择要删除的评论' }, { status: 400 })
      }
      result = await db.productReview.deleteMany({
        where: {
          productId,
          id: { in: ids },
        },
      })
    }

    return NextResponse.json({ ok: true, deletedCount: result.count })
  } catch (error) {
    console.error('批量删除评论失败:', error)
    return NextResponse.json({ error: '批量删除评论失败' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: '非法来源' }, { status: 403 })
    }
    const { response } = await requireAdminSession(request)
    if (response) return response

    const { id } = await context.params
    const body = await request.json()
  const {
      isVisible,
      country,
      name,
      title,
      content,
      rating,
      images,
      createdAt,
    } = body

    if (typeof content !== 'string' || content.trim() === '') {
      return NextResponse.json({ error: '内容必填' }, { status: 400 })
    }
    const safeRating = Math.max(1, Math.min(5, Number(rating || 5)))

    const created = await db.productReview.create({
      data: {
        productId: id,
        isVisible: isVisible !== false,
        country: (country ?? '') || null,
        name: (name ?? '') || null,
        title: (title ?? '') || null,
        content: content.trim(),
        rating: safeRating,
        images: (() => {
          try {
            if (Array.isArray(images)) return JSON.stringify(images)
            if (typeof images === 'string') return images
            return null
          } catch { return null }
        })(),
        createdAt: (() => {
          try {
            if (!createdAt) return undefined as unknown as Date
            const d = new Date(createdAt)
            return isNaN(d.getTime()) ? undefined as unknown as Date : d
          } catch { return undefined as unknown as Date }
        })(),
      },
    })

    const result = {
      id: created.id,
      productId: created.productId,
      isVisible: created.isVisible,
      country: created.country || '',
      name: created.name || '',
      title: created.title || '',
      content: created.content,
      rating: created.rating,
      images: (() => { try { return created.images ? JSON.parse(created.images) : [] } catch { return [] } })(),
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('创建评论失败:', error)
    return NextResponse.json({ error: '创建评论失败' }, { status: 500 })
  }
}
