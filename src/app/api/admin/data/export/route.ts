import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [
      categories,
      products,
      productReviews,
      messages,
      siteSettings,
      navigation,
      homeContent,
      carouselItems,
      images
    ] = await db.$transaction([
      db.category.findMany(),
      db.product.findMany(),
      db.productReview.findMany(),
      db.message.findMany(),
      db.siteSettings.findMany(),
      db.navigation.findMany(),
      db.homeContent.findMany(),
      db.carouselItem.findMany(),
      (db as any).image.findMany()
    ])

    // 处理图片数据，将 Buffer 转为 Base64
    const processedImages = images.map((img: any) => ({
      ...img,
      data: img.data.toString('base64')
    }))

    const data = {
      version: '1.1',
      timestamp: new Date().toISOString(),
      categories,
      products,
      productReviews,
      messages,
      siteSettings,
      navigation,
      homeContent,
      carouselItems,
      images: processedImages
    }

    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="backup-${new Date().toISOString().split('T')[0]}.json"`
      }
    })
  } catch (error) {
    console.error('Export failed:', error)
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    )
  }
}
