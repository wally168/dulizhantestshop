import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // 1. 获取所有基础数据
    // 使用 Promise.all 并行查询，但不在事务中，以减少数据库锁定时间并允许部分失败排查
    const [
      categories,
      products,
      productReviews,
      messages,
      siteSettings,
      navigation,
      homeContent,
      carouselItems
    ] = await Promise.all([
      db.category.findMany(),
      db.product.findMany(),
      db.productReview.findMany(),
      db.message.findMany(),
      db.siteSettings.findMany(),
      db.navigation.findMany(),
      db.homeContent.findMany(),
      db.carouselItem.findMany()
    ]);

    // 2. 单独尝试获取图片数据
    // 图片数据量可能很大，容易导致内存溢出或响应体过大
    let images: any[] = [];
    try {
      // 检查 image 模型是否存在于 Prisma 客户端
      if ((db as any).image) {
        images = await (db as any).image.findMany();
      }
    } catch (imgError) {
      console.error('Failed to fetch images:', imgError);
      // 图片获取失败不应阻塞其他数据的导出
      // 可以选择记录错误或返回空数组
    }

    // 3. 处理图片数据，将 Buffer 转为 Base64
    // 增加安全性检查
    const processedImages = images.map((img: any) => {
      try {
        return {
          ...img,
          data: img.data ? img.data.toString('base64') : null
        };
      } catch (e) {
        console.error(`Failed to process image ${img.id}`, e);
        return null;
      }
    }).filter(Boolean);

    // 4. 构建返回数据
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
    };

    // 5. 检查数据大小（估算）
    const jsonString = JSON.stringify(data, null, 2);
    const sizeInBytes = new TextEncoder().encode(jsonString).length;
    const limitBytes = 4.5 * 1024 * 1024; // Vercel Serverless Function Payload Limit (approx 4.5MB)

    if (sizeInBytes > limitBytes) {
      // 如果超限，尝试移除图片数据后再次尝试
      console.warn(`Export data size (${sizeInBytes} bytes) exceeds Vercel limit. Retrying without images.`);
      const dataWithoutImages = { ...data, images: [] };
      return new NextResponse(JSON.stringify(dataWithoutImages, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="backup-no-images-${new Date().toISOString().split('T')[0]}.json"`,
          'X-Export-Warning': 'Images excluded due to size limit'
        }
      });
    }

    return new NextResponse(jsonString, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="backup-${new Date().toISOString().split('T')[0]}.json"`
      }
    });

  } catch (error: any) {
    console.error('Export failed:', error);
    return NextResponse.json(
      { 
        error: 'Failed to export data',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
