import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SettingsProvider, SiteSettings } from "@/lib/settings";
import AppShell from "@/components/AppShell";
import { headers } from "next/headers";
import Script from "next/script";
import { cache } from "react";

const LEGAL_DEFAULTS = {
  privacyPolicy: 'Overview\n\nWe value your privacy. This policy explains what data we collect, how we use it, and your rights. We collect basic information needed to operate our services, never sell personal data, and provide ways to access, correct, or delete your information.\n\nData We Collect\n\n- Account information such as name and email.\n- Order and payment details processed securely.\n- Website usage analytics to improve experience.\n\nYour Rights\n\n- Access, correct, or delete your personal data.\n- Opt-out of marketing communications anytime.\n- Contact us for privacy-related questions.\n\nContact\n\nFor privacy inquiries, email us at contact@yourbrand.com.',
  privacyPolicyLegacy: 'We value your privacy. This policy explains what data we collect, how we use it, and your rights. We collect basic information needed to operate our services, never sell personal data, and provide ways to access, correct, or delete your information.',
  termsOfService: 'Agreement to Terms\n\nBy using our site, you agree to our terms. This includes acceptable use, product information, pricing, shipping, returns, disclaimers, and limitations of liability. Please review carefully and contact us with any questions.\n\nUse of the Service\n\n- Do not misuse or attempt to disrupt the site.\n- Product details, pricing, shipping, and returns are subject to change.\n- We may update these terms; continued use constitutes acceptance.\n\nLimitation of Liability\n\nTo the fullest extent permitted by law, we are not liable for indirect or incidental damages arising from your use of the site.\n\nContact\n\nQuestions about these terms? Email contact@yourbrand.com.',
  termsOfServiceLegacy: 'By using our site, you agree to our terms. This includes acceptable use, product information, pricing, shipping, returns, disclaimers, and limitations of liability. Please review carefully and contact us with any questions.',
  afterSalesPolicy: 'Support Scope\n\nWe are committed to providing dependable after-sales support. If you receive a damaged, defective, or incorrect item, please contact us within 7 days of delivery with your order details and photos when applicable.\n\nEligible issues may be resolved through troubleshooting guidance, replacement parts, a product exchange, or a refund depending on the situation and product condition.\n\nItems returned for inspection should be sent back in their original packaging whenever possible. Products that show misuse, unauthorized modification, or damage caused after delivery may not qualify for after-sales service.\n\nFor warranty-related requests, please include your order number, a description of the issue, and any supporting images or videos so our team can review and assist promptly.\n\nHow To Request Service\n\n- Contact our support team with your order number and product details.\n- Share photos or videos if the product arrives damaged or develops a fault.\n- Keep original packaging and accessories if a return or exchange is required.\n\nPossible Resolutions\n\n- Troubleshooting guidance for setup or usage issues.\n- Replacement parts, product exchange, or refund when approved.\n- Warranty review based on product condition and order verification.\n\nContact\n\nFor after-sales assistance, email us at contact@yourbrand.com.',
  afterSalesPolicyLegacy: 'We are committed to providing dependable after-sales support. If you receive a damaged, defective, or incorrect item, please contact us within 7 days of delivery with your order details and photos when applicable.\n\nEligible issues may be resolved through troubleshooting guidance, replacement parts, a product exchange, or a refund depending on the situation and product condition.\n\nItems returned for inspection should be sent back in their original packaging whenever possible. Products that show misuse, unauthorized modification, or damage caused after delivery may not qualify for after-sales service.\n\nFor warranty-related requests, please include your order number, a description of the issue, and any supporting images or videos so our team can review and assist promptly.',
} as const

function upgradeLegacyLegalContent(settings: SiteSettings): SiteSettings {
  const next = { ...settings }
  if (!next.privacyPolicy || next.privacyPolicy === LEGAL_DEFAULTS.privacyPolicyLegacy) {
    next.privacyPolicy = LEGAL_DEFAULTS.privacyPolicy
  }
  if (!next.termsOfService || next.termsOfService === LEGAL_DEFAULTS.termsOfServiceLegacy) {
    next.termsOfService = LEGAL_DEFAULTS.termsOfService
  }
  if (!next.afterSalesPolicy || next.afterSalesPolicy === LEGAL_DEFAULTS.afterSalesPolicyLegacy) {
    next.afterSalesPolicy = LEGAL_DEFAULTS.afterSalesPolicy
  }
  return next
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

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
  messageForwardEmail: '',
  messageForwardEnabled: 'false',
  socialFacebook: 'https://facebook.com/yourbrand',
  socialTwitter: 'https://twitter.com/yourbrand',
  socialInstagram: 'https://instagram.com/yourbrand',
  socialYoutube: 'https://youtube.com/yourbrand',
  footerText: '© 2025 Your Brand. All rights reserved.',
  aboutText: 'We\'re passionate about bringing you the finest products that combine quality, innovation, and style.',
  ourStory: 'Founded with a vision to make premium products accessible to everyone, Your Brand has been dedicated to curating exceptional items that enhance your daily life. We believe that quality shouldn\'t be compromised, and every product in our collection reflects this commitment.',
  ourMission: 'To provide our customers with carefully selected, high-quality products that offer both functionality and style. We work directly with trusted manufacturers and suppliers to ensure that every item meets our rigorous standards.',
  whyChooseUs: 'Rigorous quality control and product testing\nCompetitive pricing with transparent policies\nExcellent customer service and support\nFast and reliable shipping\nSatisfaction guarantee on all products',
  privacyPolicy: LEGAL_DEFAULTS.privacyPolicy,
  termsOfService: LEGAL_DEFAULTS.termsOfService,
  afterSalesPolicy: LEGAL_DEFAULTS.afterSalesPolicy,
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
const getSettings = cache(async (): Promise<SiteSettings> => {
  try {
    const settings = await db.siteSettings.findMany()
    
    // 将数据库中的设置转换为对象格式
    // 使用 any 转换以避开 Record<string, string> 和 SiteSettings 之间的严格类型不匹配
    const settingsObject: any = { ...defaultSettings }
    
    // 用数据库中的值覆盖
    settings.forEach(setting => {
      settingsObject[setting.key] = setting.value
    })

    return upgradeLegacyLegalContent(settingsObject as SiteSettings)
  } catch (error) {
    console.error('Failed to fetch settings from DB:', error);
  }
  return upgradeLegacyLegalContent(defaultSettings as SiteSettings);
})

// 服务器端预取导航（首屏初始数据）
const getNavigation = cache(async () => {
  try {
    const baseUrl = await getBaseUrl();
    const response = await fetch(`${baseUrl}/api/navigation`, { next: { revalidate: 3600 } });
    if (response.ok) {
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    }
  } catch (error) {
    console.error('Failed to fetch navigation:', error);
  }
  return [];
})

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
  function extractScriptsAndRemainder(html: string): { scripts: Array<{ src?: string; content?: string; attrs: Record<string, string> }>, remainder: string } {
    if (!html || typeof html !== 'string') return { scripts: [], remainder: '' }
    const scripts: Array<{ src?: string; content?: string; attrs: Record<string, string> }> = []
    const regexp = /<script([^>]*)>([\s\S]*?)<\/script>/gi
    const remainder = html.replace(regexp, (_full, attrStrRaw, contentRaw) => {
      const attrStr = attrStrRaw || ''
      const content = contentRaw || ''
      const attrs: Record<string, string> = {}
      attrStr.replace(
        /(\w+)(\s*=\s*"([^"]*)"|\s*=\s*'([^']*)'|\s*=\s*([^\s"'>]+))?/g,
        (_match: string, k: string, _v: string, q1?: string, q2?: string, q3?: string) => {
        const val = q1 ?? q2 ?? q3 ?? ''
        attrs[k] = val
        return ''
        }
      )
      const src = attrs.src
      scripts.push({ src, content, attrs })
      return ''
    })
    return { scripts, remainder }
  }

  const headScripts = extractScriptsAndRemainder((settings as any).analyticsHeadHtml || '')
  const googleScripts = extractScriptsAndRemainder((settings as any).analyticsGoogleHtml || '')
  const bodyScripts = extractScriptsAndRemainder((settings as any).analyticsBodyHtml || '')
  const sanitizedBodyHtml = bodyScripts.remainder
    .replace(/<\/?(html|head|body)[^>]*>/gi, '')
    .replace(/<meta[^>]*name=['"]viewport['"][^>]*>/gi, '')

  return (
    <html lang="en">
      <head>
        {headScripts.scripts.concat(googleScripts.scripts).map((s, idx) => (
          s.src ? (
            <Script key={`a-head-${idx}`} src={s.src} strategy="afterInteractive" />
          ) : (
            <Script key={`a-head-inline-${idx}`} id={`a-head-inline-${idx}`} strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: s.content || '' }} />
          )
        ))}
      </head>
      <body suppressHydrationWarning className={`${inter.variable} font-sans antialiased bg-white text-gray-900`}>
        <SettingsProvider initialSettings={settings}>
          <AppShell initialNavItems={initialNavItems}>
            {children}
          </AppShell>
        </SettingsProvider>
        {sanitizedBodyHtml ? <div dangerouslySetInnerHTML={{ __html: sanitizedBodyHtml }} /> : null}
        {bodyScripts.scripts.map((s, idx) => (
          s.src ? (
            <Script key={`a-body-${idx}`} src={s.src} strategy="afterInteractive" />
          ) : (
            <Script key={`a-body-inline-${idx}`} id={`a-body-inline-${idx}`} strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: s.content || '' }} />
          )
        ))}
      </body>
    </html>
  );
}
