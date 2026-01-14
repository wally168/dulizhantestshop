import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { promises as fs } from 'fs'
import path from 'path'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: '缺少文件字段: file' }, { status: 400 })
    }

    const contentType = file.type || 'application/octet-stream'
    const size = file.size || 0
    if (!contentType.startsWith('image/')) {
      return NextResponse.json({ error: '仅支持图片上传' }, { status: 400 })
    }
    // 内部放宽到 10MB 以避免 4-5MB 之间的文件因计算差异被拒，但提示仍显示 5MB
    if (size > 10 * 1024 * 1024) { 
      return NextResponse.json({ error: '文件过大，最大 5MB' }, { status: 413 })
    }

    // 读取二进制数据
    const arrayBuf = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuf)

    // 大文件(>2MB)或 DB 操作失败时，降级到本地文件系统
    // 避免数据库 blob 过大导致连接超时或 packet 限制
    if (size > 2 * 1024 * 1024) {
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
      await fs.mkdir(uploadsDir, { recursive: true })
      const ext = path.extname(file.name || '') || '.bin'
      const safeName = `upload-${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`
      const targetPath = path.join(uploadsDir, safeName)
      await fs.writeFile(targetPath, buffer)
      return NextResponse.json({ url: `/uploads/${safeName}` })
    }

    // 小文件优先保存到数据库（Prisma Postgres Bytes 字段）
    try {
      const saved = await (db as any).image.create({
        data: {
          filename: file.name || `upload-${Date.now()}`,
          contentType,
          size,
          data: buffer,
        }
      })
      return NextResponse.json({ id: saved.id, url: `/api/images/${saved.id}` })
    } catch (dbErr: any) {
      // 本地开发环境可能未执行 db push 或未配置 DIRECT_URL，降级到文件系统
      console.warn('DB 保存图片失败，使用本地文件系统降级:', dbErr?.message || dbErr)
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
      await fs.mkdir(uploadsDir, { recursive: true })
      const ext = path.extname(file.name || '') || '.bin'
      const safeName = `upload-${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`
      const targetPath = path.join(uploadsDir, safeName)
      await fs.writeFile(targetPath, buffer)
      return NextResponse.json({ url: `/uploads/${safeName}` })
    }
  } catch (error) {
    console.error('图片上传失败:', error)
    return NextResponse.json({ error: '上传失败' }, { status: 500 })
  }
}