import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { normalizeAsin, slugify } from '@/lib/utils'
import * as XLSX from 'xlsx'
import { isSameOrigin, requireAdminSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: '非法来源' }, { status: 403 })
  }
  const { response } = await requireAdminSession(request)
  if (response) return response

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const categoryId = formData.get('categoryId') as string
    const brandId = formData.get('brandId') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!categoryId) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' })

    const getRowValue = (row: Record<string, any>, aliases: readonly string[]) => {
      for (const key of aliases) {
        if (key in row) return row[key]
      }
      return undefined
    }

    const getTrimmedText = (row: Record<string, any>, aliases: readonly string[]) => {
      const value = getRowValue(row, aliases)
      if (value === undefined || value === null) return null
      const text = String(value).trim()
      return text || null
    }

    const parseOptionalNumber = (row: Record<string, any>, aliases: readonly string[]) => {
      const value = getRowValue(row, aliases)
      if (value === undefined || value === null || String(value).trim() === '') return null
      const parsed = parseFloat(String(value))
      return Number.isFinite(parsed) ? parsed : null
    }

    const OPTIONAL_IMPORT_FIELDS = {
      asin: ['asin', 'ASIN'],
      originalPrice: ['original_price', 'originalPrice', 'Original Price', '原价', 'list_price', 'List Price'],
      brand: ['brand', 'Brand', '品牌'],
      upc: ['upc', 'UPC'],
      material: ['material', 'Material'],
      itemDimensions: ['item_dimensions', 'itemDimensions', 'Item dimensions', 'Item Dimensions'],
      color: ['color', 'Color'],
      style: ['style', 'Style'],
      itemWeight: ['item_weight', 'itemWeight', 'Item Weight', 'item weight'],
      modelNumber: ['model_number', 'modelNumber', 'Model Number'],
      modelName: ['model_name', 'modelName', 'Model Name'],
      itemTypeName: ['item_type_name', 'itemTypeName', 'Item Type Name'],
      manufacturer: ['manufacturer', 'Manufacturer'],
      pattern: ['pattern', 'Pattern'],
      size: ['size', 'Size'],
    } as const

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    }

    for (const row of jsonData as any[]) {
      try {
        // Validate required fields
        const title = getTrimmedText(row, ['title', 'Title', '标题', 'name', 'Name', '名称'])
        const amazonUrl = getTrimmedText(row, ['url', 'URL', 'amazonUrl', 'Amazon URL', 'amazon_url', '亚马逊链接'])
        const description = getTrimmedText(row, ['description', 'Description', '描述', '详情']) || ''
        const priceValue = getRowValue(row, ['price', 'Price', '价格', '售价'])
        const normalizedAsin = normalizeAsin(getTrimmedText(row, OPTIONAL_IMPORT_FIELDS.asin))
        const originalPrice = parseOptionalNumber(row, OPTIONAL_IMPORT_FIELDS.originalPrice)

        if (!title || priceValue === undefined || priceValue === null || String(priceValue).trim() === '' || !amazonUrl) {
          results.failed++
          results.errors.push(`Row missing required fields: ${JSON.stringify(row)}`)
          continue
        }

        // Generate slug
        let slug = slugify(title)
        let suffix = 1
        const originalSlug = slug
        while (await db.product.findUnique({ where: { slug } })) {
          slug = `${originalSlug}-${suffix++}`
        }

        // Process images
        // Expecting "images" column to be a string (maybe comma separated or JSON?) or just handle single image
        // The user example had "images" as a field.
        // Assuming images is a URL or comma-separated URLs
        let imagesList: string[] = []
        const imageValue = getRowValue(row, ['images', 'Images', 'image', 'Image', '图片', '图片地址'])
        if (imageValue) {
           // If it looks like a JSON array
           if (typeof imageValue === 'string' && imageValue.trim().startsWith('[')) {
             try {
               imagesList = JSON.parse(imageValue)
             } catch {
               imagesList = [String(imageValue)]
             }
           } else {
             // Split by comma or space if multiple?
             // Let's assume space or comma separated if not JSON
             imagesList = String(imageValue).split(/[\s,]+/).filter(Boolean)
           }
        }
        
        // Also handle "images" column from user input which might be just one URL
        
        const mainImage = imagesList.length > 0 ? imagesList[0] : ''
        
        // Process bullet points
        const bulletPoints = []
        for (let i = 1; i <= 5; i++) {
          const bullet = getTrimmedText(row, [`bullet_point_${i}`, `Bullet Point ${i}`, `bulletPoint${i}`, `要点${i}`])
          if (bullet) {
            bulletPoints.push(bullet)
          }
        }
        for (let i = 6; i <= 8; i++) {
          const bullet = getTrimmedText(row, [`bullet_point_${i}`, `Bullet Point ${i}`, `bulletPoint${i}`, `要点${i}`])
          if (bullet) {
            bulletPoints.push(bullet)
          }
        }

        // Process price
        const price = parseFloat(String(priceValue))
        if (isNaN(price)) {
          results.failed++
          results.errors.push(`Invalid price for product: ${title}`)
          continue
        }

        // Process release_date
        let publishedAt = null
        const releaseDate = getRowValue(row, ['release_date', 'releaseDate', 'Release Date', '发布日期', '上架时间'])
        if (releaseDate) {
            // Excel dates can be tricky. XLSX.utils.sheet_to_json might return number or string.
            // If raw: false (default), it tries to format.
            // Let's assume it's parseable by Date or it's an Excel serial date if we read differently.
            // But sheet_to_json default behavior is usually fine for standard dates.
            publishedAt = new Date(releaseDate)
            if (isNaN(publishedAt.getTime())) {
                publishedAt = new Date() // Fallback to now or null?
            }
        }

        if (normalizedAsin) {
          const asinConflict = await db.product.findUnique({ where: { asin: normalizedAsin } })
          if (asinConflict) {
            results.failed++
            results.errors.push(`ASIN already exists for product: ${title}`)
            continue
          }
          const asinConflictBySlug = await db.product.findUnique({ where: { slug: normalizedAsin } })
          if (asinConflictBySlug) {
            results.failed++
            results.errors.push(`ASIN conflicts with existing product slug: ${title}`)
            continue
          }
        }

        await db.product.create({
          data: {
            title,
            slug,
            asin: normalizedAsin,
            mainImage: mainImage,
            images: JSON.stringify(imagesList),
            price: price,
            originalPrice,
            amazonUrl,
            categoryId: categoryId,
            brandId: brandId || null,
            brand: getTrimmedText(row, OPTIONAL_IMPORT_FIELDS.brand),
            upc: getTrimmedText(row, OPTIONAL_IMPORT_FIELDS.upc),
            material: getTrimmedText(row, OPTIONAL_IMPORT_FIELDS.material),
            itemDimensions: getTrimmedText(row, OPTIONAL_IMPORT_FIELDS.itemDimensions),
            color: getTrimmedText(row, OPTIONAL_IMPORT_FIELDS.color),
            style: getTrimmedText(row, OPTIONAL_IMPORT_FIELDS.style),
            itemWeight: getTrimmedText(row, OPTIONAL_IMPORT_FIELDS.itemWeight),
            modelNumber: getTrimmedText(row, OPTIONAL_IMPORT_FIELDS.modelNumber),
            modelName: getTrimmedText(row, OPTIONAL_IMPORT_FIELDS.modelName),
            itemTypeName: getTrimmedText(row, OPTIONAL_IMPORT_FIELDS.itemTypeName),
            manufacturer: getTrimmedText(row, OPTIONAL_IMPORT_FIELDS.manufacturer),
            pattern: getTrimmedText(row, OPTIONAL_IMPORT_FIELDS.pattern),
            size: getTrimmedText(row, OPTIONAL_IMPORT_FIELDS.size),
            bulletPoints: JSON.stringify(bulletPoints),
            description,
            publishedAt: publishedAt,
            showBuyOnAmazon: true,
            showAddToCart: true,
            active: true
          }
        })

        results.success++
      } catch (err: any) {
        console.error('Error processing row:', row, err)
        results.failed++
        results.errors.push(`Error processing ${row.title || row.name || 'unknown'}: ${err.message}`)
      }
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json({ error: 'Failed to process import' }, { status: 500 })
  }
}
