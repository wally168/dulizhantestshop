export const dynamic = 'force-dynamic'
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SettingsProvider, SiteSettings } from "@/lib/settings";
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

import { db } from "@/lib/db";

// 默认设置
const defaultSettings = {
  siteName: 'Your Brand',
  logoUrl: '',
  siteDescription: 'Discover premium products with exceptional quality and design',
  siteKeywords: 'premium products, quality, design, lifestyle',
  contactEmail: 'contact@yourbrand.com',
  contactPhone: '+1 (555) 123-4567',
  contactAddress: '123 Main Street, City, State 12345',
  socialFacebook: 'https://facebook.com/yourbrand',
  socialTwitter: 'https://twitter.com/yourbrand',
  socialInstagram: 'https://instagram.com/yourbrand',
  socialYoutube: 'https://youtube.com/yourbrand',
  footerText: '© 2025 Your Brand. All rights reserved.',
  aboutText: 'We\'re passionate about bringing you the finest products that combine quality, innovation, and style.',
  ourStory: 'Founded with a vision to make premium products accessible to everyone, Your Brand has been dedicated to curating exceptional items that enhance your daily life. We believe that quality shouldn\'t be compromised, and every product in our collection reflects this commitment.',
  ourMission: 'To provide our customers with carefully selected, high-quality products that offer both functionality and style. We work directly with trusted manufacturers and suppliers to ensure that every item meets our rigorous standards.',
  whyChooseUs: 'Rigorous quality control and product testing\nCompetitive pricing with transparent policies\nExcellent customer service and support\nFast and reliable shipping\nSatisfaction guarantee on all products',
  privacyPolicy: 'We value your privacy. This policy explains what data we collect, how we use it, and your rights. We collect basic information needed to operate our services, never sell personal data, and provide ways to access, correct, or delete your information.',
  termsOfService: 'By using our site, you agree to our terms. This includes acceptable use, product information, pricing, shipping, returns, disclaimers, and limitations of liability. Please review carefully and contact us with any questions.',
  analyticsHeadHtml: '',
  analyticsBodyHtml: '',
  analyticsGoogleHtml: '',
  // SEO
  seoTitle: '',
  seoKeywords: 'premium products, quality, design, lifestyle',
  seoDescription: 'Discover premium products with exceptional quality and design',
  seoSummary: '',
  // Site verification
  googleSiteVerification: '',
  baiduSiteVerification: ''
}

// 动态获取站点设置（服务端直接查询数据库）
async function getSettings(): Promise<SiteSettings> {
  try {
    const settings = await db.siteSettings.findMany()
    
    // 将数据库中的设置转换为对象格式
    // 使用 any 转换以避开 Record<string, string> 和 SiteSettings 之间的严格类型不匹配
    const settingsObject: any = { ...defaultSettings }
    
    // 用数据库中的值覆盖
    settings.forEach(setting => {
      settingsObject[setting.key] = setting.value
    })

    return settingsObject as SiteSettings
  } catch (error) {
    console.error('Failed to fetch settings from DB:', error);
  }
  return defaultSettings as SiteSettings;
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
  
  // Smart title resolution:
  // 1. Use SEO Title if set and not the default "Your Brand"
  // 2. Fallback to Site Name
  // 3. Fallback to "Your Brand"
  let title = (settings as any).seoTitle;
  const siteName = settings.siteName || 'Your Brand';
  
  if (!title || title === 'Your Brand') {
    title = siteName;
  }

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
