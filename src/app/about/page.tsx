'use client'

import Layout from '@/components/Layout'
import { useSettings } from '@/lib/settings'
import { getTranslations, parseI18nMap, resolveContent, resolveContentList, resolveI18nList, resolveI18nText } from '@/lib/utils'

export default function AboutPage() {
  const { settings, loading, language } = useSettings()
  const t = getTranslations(language)
  const contentI18n = parseI18nMap((settings as any).contentI18n)
  const aboutTextBase = loading ? resolveContent(undefined, 'aboutText', language) : resolveContent(settings.aboutText, 'aboutText', language)
  const ourStoryBase = loading ? resolveContent(undefined, 'ourStory', language) : resolveContent(settings.ourStory, 'ourStory', language)
  const ourMissionBase = loading ? resolveContent(undefined, 'ourMission', language) : resolveContent(settings.ourMission, 'ourMission', language)
  const whyChooseBase = loading ? resolveContentList(undefined, language) : resolveContentList(settings.whyChooseUs, language)
  const aboutText = resolveI18nText(aboutTextBase, contentI18n, language, 'aboutText')
  const ourStory = resolveI18nText(ourStoryBase, contentI18n, language, 'ourStory')
  const ourMission = resolveI18nText(ourMissionBase, contentI18n, language, 'ourMission')
  const whyChooseUs = resolveI18nList(whyChooseBase, contentI18n, language, 'whyChooseUs')

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
                {aboutText}
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
                {ourStory}
              </p>
              
              <h2>{t.about.ourMission}</h2>
              <p>
                {ourMission}
              </p>

              <h2>{t.about.whyChooseUs}</h2>
              <ul>
                {whyChooseUs.map((item, index) => (
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
