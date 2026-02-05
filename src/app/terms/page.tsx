'use client'
export const dynamic = 'force-dynamic'

import Layout from '@/components/Layout'
import { useSettings } from '@/lib/settings'
import { getTranslations, parseI18nMap, resolveContent, resolveI18nText } from '@/lib/utils'

export default function TermsPage() {
  const { settings, loading, language } = useSettings()
  const t = getTranslations(language)
  const contentI18n = parseI18nMap((settings as any).contentI18n)
  const contentBase = loading ? resolveContent(undefined, 'termsOfService', language) : resolveContent(settings.termsOfService, 'termsOfService', language)
  const content = resolveI18nText(contentBase, contentI18n, language, 'termsOfService')
  const paragraphs = content.split('\n').filter(p => p.trim().length)

  return (
    <Layout>
      <div className="bg-white">
        <div className="relative bg-gradient-to-br from-blue-50 to-indigo-100 py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                {t.terms.title}
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600">
                {t.terms.intro}
              </p>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <div className="prose prose-lg prose-blue mx-auto">
              <h2>{t.terms.agreement}</h2>
              {paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}

              <h2>{t.terms.useOfService}</h2>
              <ul>
                {t.terms.useItems.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>

              <h2>{t.terms.limitation}</h2>
              <p>
                {t.terms.limitationText}
              </p>

              <h2>{t.terms.contact}</h2>
              <p>
                {t.terms.contactText} {loading ? 'contact@yourbrand.com' : settings.contactEmail}.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
