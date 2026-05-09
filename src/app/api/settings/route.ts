import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isSameOrigin, requireAdminSession } from '@/lib/auth'
import { Prisma } from '@prisma/client'

const LEGAL_DEFAULTS = {
  privacyPolicy: 'Overview\n\nWe value your privacy. This policy explains what data we collect, how we use it, and your rights. We collect basic information needed to operate our services, never sell personal data, and provide ways to access, correct, or delete your information.\n\nData We Collect\n\n- Account information such as name and email.\n- Order and payment details processed securely.\n- Website usage analytics to improve experience.\n\nYour Rights\n\n- Access, correct, or delete your personal data.\n- Opt-out of marketing communications anytime.\n- Contact us for privacy-related questions.\n\nContact\n\nFor privacy inquiries, email us at contact@yourbrand.com.',
  privacyPolicyLegacy: 'We value your privacy. This policy explains what data we collect, how we use it, and your rights. We collect basic information needed to operate our services, never sell personal data, and provide ways to access, correct, or delete your information.',
  termsOfService: 'Agreement to Terms\n\nBy using our site, you agree to our terms. This includes acceptable use, product information, pricing, shipping, returns, disclaimers, and limitations of liability. Please review carefully and contact us with any questions.\n\nUse of the Service\n\n- Do not misuse or attempt to disrupt the site.\n- Product details, pricing, shipping, and returns are subject to change.\n- We may update these terms; continued use constitutes acceptance.\n\nLimitation of Liability\n\nTo the fullest extent permitted by law, we are not liable for indirect or incidental damages arising from your use of the site.\n\nContact\n\nQuestions about these terms? Email contact@yourbrand.com.',
  termsOfServiceLegacy: 'By using our site, you agree to our terms. This includes acceptable use, product information, pricing, shipping, returns, disclaimers, and limitations of liability. Please review carefully and contact us with any questions.',
  afterSalesPolicy: 'Support Scope\n\nWe are committed to providing dependable after-sales support. If you receive a damaged, defective, or incorrect item, please contact us within 7 days of delivery with your order details and photos when applicable.\n\nEligible issues may be resolved through troubleshooting guidance, replacement parts, a product exchange, or a refund depending on the situation and product condition.\n\nItems returned for inspection should be sent back in their original packaging whenever possible. Products that show misuse, unauthorized modification, or damage caused after delivery may not qualify for after-sales service.\n\nFor warranty-related requests, please include your order number, a description of the issue, and any supporting images or videos so our team can review and assist promptly.\n\nHow To Request Service\n\n- Contact our support team with your order number and product details.\n- Share photos or videos if the product arrives damaged or develops a fault.\n- Keep original packaging and accessories if a return or exchange is required.\n\nPossible Resolutions\n\n- Troubleshooting guidance for setup or usage issues.\n- Replacement parts, product exchange, or refund when approved.\n- Warranty review based on product condition and order verification.\n\nContact\n\nFor after-sales assistance, email us at contact@yourbrand.com.',
  afterSalesPolicyLegacy: 'We are committed to providing dependable after-sales support. If you receive a damaged, defective, or incorrect item, please contact us within 7 days of delivery with your order details and photos when applicable.\n\nEligible issues may be resolved through troubleshooting guidance, replacement parts, a product exchange, or a refund depending on the situation and product condition.\n\nItems returned for inspection should be sent back in their original packaging whenever possible. Products that show misuse, unauthorized modification, or damage caused after delivery may not qualify for after-sales service.\n\nFor warranty-related requests, please include your order number, a description of the issue, and any supporting images or videos so our team can review and assist promptly.',
} as const

function upgradeLegacyLegalContent(settings: Record<string, string>) {
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

// 默认设置
const defaultSettings = {
  siteName: 'Your Brand',
  logoUrl: '',
  logoWidth: '',
  logoHeight: '',
  siteDescription: 'Discover premium products with exceptional quality and design',
  siteKeywords: 'premium products, quality, design, lifestyle',
  contactEmail: 'contact@yourbrand.com',
  contactPhone: '+1 (555) 123-4567',
  contactAddress: '123 Main Street, City, State 12345',
  messageForwardEmail: '',
  messageForwardEnabled: 'false',
  socialFacebook: 'https://facebook.com/yourbrand',
  socialFacebookTitle: 'Facebook',
  socialTwitter: 'https://twitter.com/yourbrand',
  socialTwitterTitle: 'Twitter',
  socialInstagram: 'https://instagram.com/yourbrand',
  socialInstagramTitle: 'Instagram',
  socialYoutube: 'https://youtube.com/yourbrand',
  socialYoutubeTitle: 'YouTube',
  socialTiktok: '',
  socialTiktokTitle: 'TikTok',
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
  // Sitemap
  sitemapEnabled: 'true',
  sitemapChangefreq: 'daily',
  sitemapPriority: '0.7',
  sitemapIncludeProducts: 'true',
  sitemapIncludeCategories: 'true',
  // Robots
  robotsAllowAll: 'true',
  robotsDisallowAdmin: 'true',
  robotsDisallowApi: 'true',
  robotsDisallowCart: 'true',
  robotsDisallowCheckout: 'true',
  robotsDisallowSearch: 'true',
  robotsExtraRules: '',
  // Site verification
  googleSiteVerification: '',
  baiduSiteVerification: ''
}

// GET - 获取所有设置
export async function GET() {
  try {
    const settings = await db.siteSettings.findMany()
    
    // 将数据库中的设置转换为对象格式
    const settingsObject: Record<string, string> = {}
    
    // 先填充默认值
    Object.entries(defaultSettings).forEach(([key, value]) => {
      settingsObject[key] = value
    })
    
    // 然后用数据库中的值覆盖
    settings.forEach(setting => {
      settingsObject[setting.key] = setting.value
    })

    return NextResponse.json(upgradeLegacyLegalContent(settingsObject), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      }
    })
  } catch (error) {
    console.error('获取设置失败:', error)
    return NextResponse.json({ error: '获取设置失败' }, { 
      status: 500,
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      }
    })
  }
}

// PUT - 更新设置（需管理员登录）
export async function PUT(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: '非法来源' }, { status: 403 })
  }
  const { response } = await requireAdminSession(request)
  if (response) return response

  try {
    const body = await request.json()
    
    // 使用批量事务更新设置，兼容 Data Proxy（避免交互式事务）
    const ops: Prisma.PrismaPromise<any>[] = []
    for (const [key, value] of Object.entries(body)) {
      const stringValue = typeof value === 'string' ? value : String(value)
      ops.push(
        db.siteSettings.upsert({
          where: { key },
          update: { value: stringValue },
          create: { key, value: stringValue, description: `${key} setting` }
        })
      )
    }
    await db.$transaction(ops)

    return NextResponse.json({ message: '设置更新成功' }, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      }
    })
  } catch (error) {
    console.error('更新设置失败:', error)
    return NextResponse.json({ error: '更新设置失败' }, { 
      status: 500,
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      }
    })
  }
}
