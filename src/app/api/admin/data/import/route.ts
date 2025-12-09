import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    if (!data.categories || !data.products) {
       return NextResponse.json({ error: 'Invalid data format' }, { status: 400 })
    }

    const results = {
      categories: { success: 0, failed: 0 },
      products: { success: 0, failed: 0 }
    }

    // Process categories
    for (const cat of data.categories) {
       try {
         const { id, products, ...rest } = cat // Remove relations if present
         
         const dataToSave = {
            ...rest,
            createdAt: cat.createdAt ? new Date(cat.createdAt) : undefined,
            updatedAt: cat.updatedAt ? new Date(cat.updatedAt) : undefined
         }

         await db.category.upsert({
           where: { id: cat.id },
           update: dataToSave,
           create: {
              id: cat.id,
              ...dataToSave
           }
         })
         results.categories.success++
       } catch (e) {
         console.error(`Failed to import category ${cat.name}:`, e)
         results.categories.failed++
       }
    }
    
    // Process products
    for (const prod of data.products) {
        try {
          const { id, category, reviews, ...rest } = prod // Remove relations
          
          const dataToSave = {
              ...rest,
              createdAt: prod.createdAt ? new Date(prod.createdAt) : undefined,
              updatedAt: prod.updatedAt ? new Date(prod.updatedAt) : undefined,
              publishedAt: prod.publishedAt ? new Date(prod.publishedAt) : null
          }

          await db.product.upsert({
              where: { id: prod.id },
              update: dataToSave,
              create: {
                  id: prod.id,
                  ...dataToSave
              }
          })
          results.products.success++
        } catch (e) {
          console.error(`Failed to import product ${prod.title}:`, e)
          results.products.failed++
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
