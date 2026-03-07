import { NextRequest, NextResponse } from 'next/server'
import { ensureDefaultAdmin, authenticate, createSession, buildCookieOptions, SESSION_COOKIE } from '@/lib/auth'

type AttemptInfo = { count: number; resetAt: number }
const MAX_ATTEMPTS = 10
const WINDOW_MS = 5 * 60 * 1000
const attempts = new Map<string, AttemptInfo>()

function getClientIp(request: NextRequest) {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  const real = request.headers.get('x-real-ip')
  return real || 'unknown'
}

function recordAttempt(ip: string) {
  const now = Date.now()
  const current = attempts.get(ip)
  if (!current || current.resetAt <= now) {
    const resetAt = now + WINDOW_MS
    attempts.set(ip, { count: 1, resetAt })
    return { allowed: true, remaining: MAX_ATTEMPTS - 1, resetAt }
  }
  if (current.count >= MAX_ATTEMPTS) {
    return { allowed: false, remaining: 0, resetAt: current.resetAt }
  }
  const next = { count: current.count + 1, resetAt: current.resetAt }
  attempts.set(ip, next)
  return { allowed: true, remaining: Math.max(0, MAX_ATTEMPTS - next.count), resetAt: next.resetAt }
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const rate = recordAttempt(ip)
    if (!rate.allowed) {
      return NextResponse.json({ error: '请求过于频繁，请稍后再试' }, { status: 429 })
    }

    // 确保存在默认管理员（首次运行时）
    await ensureDefaultAdmin()

    const { username, password } = await request.json()
    if (!username || !password) {
      return NextResponse.json({ error: '用户名与密码必填' }, { status: 400 })
    }

    const user = await authenticate(username, password)
    if (!user) {
      return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 })
    }

    const { token, expiresAt } = await createSession(user.id)
    const res = NextResponse.json({ success: true })
    res.cookies.set(SESSION_COOKIE, token, buildCookieOptions(expiresAt))
    attempts.delete(ip)
    return res
  } catch (error) {
    console.error('登录失败:', error)
    return NextResponse.json({ error: '登录失败' }, { status: 500 })
  }
}
