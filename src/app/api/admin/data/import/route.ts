import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    // Basic validation
    if (!data.categories && !data.products && !data.siteSettings) {
       return NextResponse.json({ error: 'Invalid data format or empty backup' }, { status: 400 })
    }

    const results = {
      images: { success: 0, failed: 0 },
      categories: { success: 0, failed: 0 },
      products: { success: 0, failed: 0 },
      productReviews: { success: 0, failed: 0 },
      messages: { success: 0, failed: 0 },
      siteSettings: { success: 0, failed: 0 },
      navigation: { success: 0, failed: 0 },
      homeContent: { success: 0, failed: 0 },
      carouselItems: { success: 0, failed: 0 },
    }

    // 1. Process Images (Independent)
    if (Array.isArray(data.images)) {
      for (const img of data.images) {
        try {
          const { id, data: base64Data, ...rest } = img
          await (db as any).image.upsert({
            where: { id },
            update: {
              ...rest,
              data: Buffer.from(base64Data, 'base64'),
              createdAt: new Date(img.createdAt)
            },
            create: {
              id,
              ...rest,
              data: Buffer.from(base64Data, 'base64'),
              createdAt: new Date(img.createdAt)
            }
          })
          results.images.success++
        } catch (e) {
          console.error(`Failed to import image ${img.filename}:`, e)
          results.images.failed++
        }
      }
    }

    // 2. Process Categories
    if (Array.isArray(data.categories)) {
      for (const cat of data.categories) {
         try {
           const { id, products, ...rest } = cat
           const dataToSave = {
              ...rest,
              createdAt: cat.createdAt ? new Date(cat.createdAt) : undefined,
              updatedAt: cat.updatedAt ? new Date(cat.updatedAt) : undefined
           }
           await db.category.upsert({
             where: { id },
             update: dataToSave,
             create: { id, ...dataToSave }
           })
           results.categories.success++
         } catch (e) {
           console.error(`Failed to import category ${cat.name}:`, e)
           results.categories.failed++
         }
      }
    }
    
    // 3. Process Products (Depends on Categories)
    if (Array.isArray(data.products)) {
      for (const prod of data.products) {
          try {
            const { id, category, reviews, ...rest } = prod
            const dataToSave = {
                ...rest,
                createdAt: prod.createdAt ? new Date(prod.createdAt) : undefined,
                updatedAt: prod.updatedAt ? new Date(prod.updatedAt) : undefined,
                publishedAt: prod.publishedAt ? new Date(prod.publishedAt) : null
            }
            await db.product.upsert({
                where: { id },
                update: dataToSave,
                create: { id, ...dataToSave }
            })
            results.products.success++
          } catch (e) {
            console.error(`Failed to import product ${prod.title}:`, e)
            results.products.failed++
          }
      }
    }

    // 4. Process Product Reviews (Depends on Products)
    if (Array.isArray(data.productReviews)) {
      for (const review of data.productReviews) {
        try {
          const { id, product, ...rest } = review
          const dataToSave = {
            ...rest,
            createdAt: review.createdAt ? new Date(review.createdAt) : undefined,
            updatedAt: review.updatedAt ? new Date(review.updatedAt) : undefined
          }
          await db.productReview.upsert({
            where: { id },
            update: dataToSave,
            create: { id, ...dataToSave }
          })
          results.productReviews.success++
        } catch (e) {
          console.error(`Failed to import review ${review.id}:`, e)
          results.productReviews.failed++
        }
      }
    }

    // 5. Process Messages
    if (Array.isArray(data.messages)) {
      for (const msg of data.messages) {
        try {
          const { id, ...rest } = msg
          const dataToSave = {
            ...rest,
            createdAt: msg.createdAt ? new Date(msg.createdAt) : undefined
          }
          await db.message.upsert({
            where: { id },
            update: dataToSave,
            create: { id, ...dataToSave }
          })
          results.messages.success++
        } catch (e) {
          console.error(`Failed to import message ${msg.id}:`, e)
          results.messages.failed++
        }
      }
    }

    // 6. Process Site Settings
    if (Array.isArray(data.siteSettings)) {
      for (const setting of data.siteSettings) {
        try {
          const { id, ...rest } = setting
          const dataToSave = {
            ...rest,
            updatedAt: setting.updatedAt ? new Date(setting.updatedAt) : undefined
          }
          await db.siteSettings.upsert({
            where: { id },
            update: dataToSave,
            create: { id, ...dataToSave }
          })
          results.siteSettings.success++
        } catch (e) {
          console.error(`Failed to import setting ${setting.key}:`, e)
          results.siteSettings.failed++
        }
      }
    }

    // 7. Process Home Content
    if (Array.isArray(data.homeContent)) {
      for (const content of data.homeContent) {
        try {
          const { id, ...rest } = content
          const dataToSave = {
            ...rest,
            createdAt: content.createdAt ? new Date(content.createdAt) : undefined,
            updatedAt: content.updatedAt ? new Date(content.updatedAt) : undefined
          }
          await db.homeContent.upsert({
            where: { id },
            update: dataToSave,
            create: { id, ...dataToSave }
          })
          results.homeContent.success++
        } catch (e) {
          console.error(`Failed to import home content ${content.id}:`, e)
          results.homeContent.failed++
        }
      }
    }

    // 8. Process Carousel Items
    if (Array.isArray(data.carouselItems)) {
      for (const item of data.carouselItems) {
        try {
          const { id, ...rest } = item
          const dataToSave = {
            ...rest,
            createdAt: item.createdAt ? new Date(item.createdAt) : undefined,
            updatedAt: item.updatedAt ? new Date(item.updatedAt) : undefined
          }
          await db.carouselItem.upsert({
            where: { id },
            update: dataToSave,
            create: { id, ...dataToSave }
          })
          results.carouselItems.success++
        } catch (e) {
          console.error(`Failed to import carousel item ${item.id}:`, e)
          results.carouselItems.failed++
        }
      }
    }

    // 9. Process Navigation (Two Pass)
    if (Array.isArray(data.navigation)) {
      // Pass 1: Create without parentId
      for (const nav of data.navigation) {
        try {
          const { id, parent, children, parentId, ...rest } = nav
          await db.navigation.upsert({
            where: { id },
            update: { ...rest, parentId: null }, // Temporarily remove parent link
            create: { id, ...rest, parentId: null }
          })
        } catch (e) {
          console.error(`Failed to import navigation pass 1 ${nav.label}:`, e)
          results.navigation.failed++ // Count failure here? Or wait for pass 2?
        }
      }
      
      // Pass 2: Link parents
      for (const nav of data.navigation) {
        if (nav.parentId) {
          try {
            await db.navigation.update({
              where: { id: nav.id },
              data: { parentId: nav.parentId }
            })
            results.navigation.success++
          } catch (e) {
             console.error(`Failed to link navigation parent for ${nav.label}:`, e)
             // If update fails but create succeeded, it's a partial success?
             // Or maybe the parent didn't exist.
          }
        } else {
          results.navigation.success++
        }
      }
    }

    return NextResponse.json({ success: true, results })

  } catch (error) {
    console.error('Import failed:', error)
    return NextResponse.json(
      { error: 'Failed to import data' },
      { status: 500 }
    )
  }
}
