'use client'

import Link from 'next/link'
import { ArrowRight, Shield, Truck, Star, Sparkles, Zap, Heart, Package } from 'lucide-react'
import Layout from '@/components/Layout'
import Carousel from '@/components/Carousel'
import { useSettings } from '@/lib/settings'
import { useState, useEffect } from 'react'

interface Product {
  id: string
  title: string
  slug: string
  mainImage: string
  price: number
  originalPrice?: number
  featured: boolean
}

interface HomeContent {
  id: string
  featuredTitle: string
  featuredSubtitle: string
  whyChooseTitle: string
  whyChooseSubtitle: string
  feature1Title: string
  feature1Description: string
  feature2Title: string
  feature2Description: string
  feature3Title: string
  feature3Description: string
  carouselEnabled?: boolean
  carouselInterval?: number
}

interface CarouselItem {
  id: string
  title?: string | null
  description?: string | null
  imageUrl: string
  link?: string | null
  btnText?: string | null
  newTab?: boolean | null
  active: boolean
}

export default function Home() {
  const { settings } = useSettings()
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([])
  const [homeContent, setHomeContent] = useState<HomeContent | null>(null)
  const [carouselItems, setCarouselItems] = useState<CarouselItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // 并行获取产品、首页内容和轮播图
      const [productsResponse, contentResponse, carouselResponse] = await Promise.all([
        fetch('/api/products?featured=true&limit=3'),
        fetch('/api/home-content'),
        fetch('/api/carousel')
      ])

      if (productsResponse.ok) {
        const productsData = await productsResponse.json()
        setFeaturedProducts(productsData)
      }

      if (contentResponse.ok) {
        const contentData = await contentResponse.json()
        setHomeContent(contentData)
      }

      if (carouselResponse.ok) {
        const carouselData = await carouselResponse.json()
        // Only show active items on frontend
        setCarouselItems(carouselData.filter((item: CarouselItem) => item.active))
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      {/* Carousel Section */}
      {(!loading && homeContent?.carouselEnabled !== false && carouselItems.length > 0) && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
          <Carousel items={carouselItems} interval={homeContent?.carouselInterval || 5000} />
        </div>
      )}

      {/* Featured Products Section */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50"></div>
        
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 tracking-tight">
              {homeContent?.featuredTitle || 'Featured Products'}
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              {homeContent?.featuredSubtitle || 'Discover our carefully curated collection of premium products, each selected for exceptional quality and design.'}
            </p>
          </div>
          
          {loading ? (
            <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
                  <div className="aspect-square bg-gray-200"></div>
                  <div className="p-6">
                    <div className="h-6 bg-gray-200 rounded mb-3"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : featuredProducts.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No featured products available</p>
              {/* Removed Add Products link to avoid redirecting to admin login */}
            </div>
          )}
          
          {featuredProducts.length > 0 && (
            <div className="text-center mt-12">
              <Link
                href="/products"
                className="btn-apple bg-blue-600 text-white px-8 py-3 rounded-2xl font-semibold hover:bg-blue-700 transition-all inline-flex items-center shadow-lg hover:shadow-xl"
              >
                View All Products
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 tracking-tight">
              {homeContent?.whyChooseTitle || `Why Choose ${settings.siteName}`}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              {homeContent?.whyChooseSubtitle || "We're redefining the shopping experience with uncompromising quality, innovative design, and customer-first approach."}
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            <FeatureCard
              icon={<Star className="h-8 w-8" />}
              iconBg="bg-gradient-to-br from-yellow-400 to-orange-500"
              title={homeContent?.feature1Title || "Premium Quality"}
              description={homeContent?.feature1Description || "Every product undergoes rigorous quality testing to ensure it meets our exceptional standards."}
            />
            
            <FeatureCard
              icon={<Shield className="h-8 w-8" />}
              iconBg="bg-gradient-to-br from-green-400 to-emerald-500"
              title={homeContent?.feature2Title || "Secure & Trusted"}
              description={homeContent?.feature2Description || "Advanced security measures protect your data with enterprise-grade encryption and privacy."}
            />
            
            <FeatureCard
              icon={<Zap className="h-8 w-8" />}
              iconBg="bg-gradient-to-br from-purple-400 to-pink-500"
              title={homeContent?.feature3Title || "Lightning Fast"}
              description={homeContent?.feature3Description || "Optimized delivery network ensures your orders arrive quickly and in perfect condition."}
            />
          </div>
        </div>
      </section>
    </Layout>
  )
}

function ProductCard({ product }: { product: Product }) {
  return (
    <Link href={`/products/${product.slug}`} className="group">
      <div className="card-hover bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-1">
        <div className="aspect-square overflow-hidden bg-gray-100">
          <img 
            src={product.mainImage} 
            alt={product.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
        <div className="p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
            {product.title}
          </h3>
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-gray-900">
              ¥{product.price}
            </span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="text-lg text-gray-500 line-through">
                ¥{product.originalPrice}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

function FeatureCard({ 
  icon, 
  iconBg, 
  title, 
  description 
}: { 
  icon: React.ReactNode
  iconBg: string
  title: string
  description: string
}) {
  return (
    <div className="card-hover bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
      <div className={`${iconBg} w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 text-white shadow-lg`}>
        {icon}
      </div>
      <h3 className="text-2xl font-semibold text-gray-900 mb-4 tracking-tight">{title}</h3>
      <p className="text-gray-600 leading-relaxed">
        {description}
      </p>
    </div>
  )
}
