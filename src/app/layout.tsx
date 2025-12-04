export const dynamic = 'force-dynamic'
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SettingsProvider } from "@/lib/settings";
import AppShell from "@/components/AppShell";
import { headers } from "next/headers";
import Script from "next/script";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

// 在服务端安全获取当前请求的 Base URL（Next 16 headers 为异步）
async function getBaseUrl(): Promise<string> {
  try {
    const h = await headers();
    const host = h.get("host");
    const proto = h.get("x-forwarded-proto") || "http";
    if (host) return `${proto}://${host}`;
  } catch {}
  return process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3005";
}

// 动态获取站点设置（服务端）
async function getSettings() {
  try {
    const baseUrl = await getBaseUrl();
    const response = await fetch(`${baseUrl}/api/settings`, { cache: 'no-store' });
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Failed to fetch settings:', error);
  }
  return { siteName: "Your Brand", siteDescription: "Discover premium products with exceptional quality and design", siteKeywords: "premium products, quality, design, shopping" };
}

// 服务器端预取导航（首屏初始数据）
async function getNavigation() {
  try {
    const baseUrl = await getBaseUrl();
    const response = await fetch(`${baseUrl}/api/navigation`, { cache: 'no-store' });
    if (response.ok) {
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    }
  } catch (error) {
    console.error('Failed to fetch navigation:', error);
  }
  return [];
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const title = (settings as any).seoTitle || settings.siteName || 'Your Brand'
  const description = (settings as any).seoDescription || settings.siteDescription || 'Discover premium products with exceptional quality and design'
  const keywords = (settings as any).seoKeywords || settings.siteKeywords || 'premium products, quality, design, lifestyle'
  const google = (settings as any).googleSiteVerification || ''
  const baidu = (settings as any).baiduSiteVerification || ''
  return {
    title,
    description,
    keywords,
    other: {
      ...(google ? { 'google-site-verification': google } : {}),
      ...(baidu ? { 'baidu-site-verification': baidu } : {}),
    },
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode; }>) {
  const settings = await getSettings();
  const initialNavItems = await getNavigation();
  function extractScripts(html: string): Array<{ src?: string; content?: string; attrs: Record<string, string> }> {
    if (!html || typeof html !== 'string') return []
    const scripts: Array<{ src?: string; content?: string; attrs: Record<string, string> }> = []
    const regexp = /<script([^>]*)>([\s\S]*?)<\/script>/gi
    let match: RegExpExecArray | null
    while ((match = regexp.exec(html))) {
      const attrStr = match[1] || ''
      const content = match[2] || ''
      const attrs: Record<string, string> = {}
      attrStr.replace(/(\w+)(\s*=\s*"([^"]*)"|\s*=\s*'([^']*)'|\s*=\s*([^\s"'>]+))?/g, (_m, k, _v, q1, q2, q3) => {
        const val = q1 ?? q2 ?? q3 ?? ''
        attrs[k] = val
        return ''
      })
      const src = attrs.src
      scripts.push({ src, content, attrs })
    }
    if (scripts.length === 0 && html.trim()) {
      scripts.push({ content: html, attrs: {} })
    }
    return scripts
  }

  const headScripts = extractScripts((settings as any).analyticsHeadHtml || '')
  const googleScripts = extractScripts((settings as any).analyticsGoogleHtml || '')
  return (
    <html lang="en">
      {headScripts.concat(googleScripts).map((s, idx) => (
        s.src ? (
          <Script key={`a-head-${idx}`} src={s.src} strategy="beforeInteractive" />
        ) : (
          <Script key={`a-head-inline-${idx}`} id={`a-head-inline-${idx}`} strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: s.content || '' }} />
        )
      ))}
      <body suppressHydrationWarning className={`${inter.variable} font-sans antialiased bg-white text-gray-900`}>
        <SettingsProvider initialSettings={settings}>
          <AppShell initialNavItems={initialNavItems}>
            {children}
          </AppShell>
          <div dangerouslySetInnerHTML={{ __html: (settings as any).analyticsBodyHtml || '' }} />
        </SettingsProvider>
      </body>
    </html>
  );
}
