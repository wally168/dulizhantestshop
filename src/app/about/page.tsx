'use client'

import Layout from '@/components/Layout'
import { useSettings } from '@/lib/settings'
import { getTranslations, resolveContent, resolveContentList } from '@/lib/utils'

export default function AboutPage() {
  const { settings, loading, language } = useSettings()
  const t = getTranslations(language)

  return (
    <Layout>
      <div className="bg-white">
        {/* Hero Section */}
        <div className="relative bg-gradient-to-br from-blue-50 to-indigo-100 py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                {t.about.title} {loading ? 'Your Brand' : settings.siteName}
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600">
                {loading ? resolveContent(undefined, 'aboutText', language) : resolveContent(settings.aboutText, 'aboutText', language)}
              </p>
            </div>
          </div>
        </div>

        {/* About Content */}
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <div className="prose prose-lg prose-blue mx-auto">
              <h2>{t.about.ourStory}</h2>
              <p>
                {loading ? resolveContent(undefined, 'ourStory', language) : resolveContent(settings.ourStory, 'ourStory', language)}
              </p>
              
              <h2>{t.about.ourMission}</h2>
              <p>
                {loading ? resolveContent(undefined, 'ourMission', language) : resolveContent(settings.ourMission, 'ourMission', language)}
              </p>

              <h2>{t.about.whyChooseUs}</h2>
              <ul>
                {(loading ? resolveContentList(undefined, language) : resolveContentList(settings.whyChooseUs, language)).map((item, index) => (
                  <li key={index}>{item.trim()}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>


      </div>
    </Layout>
  )
}
