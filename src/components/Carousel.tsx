'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface CarouselItem {
  id: string
  title?: string | null
  description?: string | null
  imageUrl: string
  link?: string | null
}

export default function Carousel({ items }: { items: CarouselItem[] }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % items.length)
  }, [items.length])

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length)
  }

  useEffect(() => {
    if (isPaused || items.length <= 1) return
    const timer = setInterval(nextSlide, 5000)
    return () => clearInterval(timer)
  }, [isPaused, items.length, nextSlide])

  if (!items.length) return null

  return (
    <div 
      className="relative w-full h-[500px] md:h-[600px] overflow-hidden group rounded-2xl shadow-xl mb-12"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {items.map((item, index) => (
        <div
          key={item.id}
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
            index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
          }`}
        >
          {/* Image */}
          <img
            src={item.imageUrl}
            alt={item.title || 'Carousel Image'}
            className="w-full h-full object-cover"
          />
          
          {/* Overlay Content */}
          {(item.title || item.description || (item.link && (item.title || item.description))) ? (
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center text-center p-4">
              <div className="max-w-4xl mx-auto text-white">
                {item.title && (
                  <h2 className="text-4xl md:text-6xl font-bold mb-4 drop-shadow-lg">
                    {item.title}
                  </h2>
                )}
                {item.description && (
                  <p className="text-xl md:text-2xl mb-8 drop-shadow-md max-w-2xl mx-auto">
                    {item.description}
                  </p>
                )}
                {item.link && (
                  <Link
                    href={item.link}
                    className="inline-block bg-white text-black px-8 py-3 rounded-full font-semibold hover:bg-gray-100 transition-colors"
                  >
                    Learn More
                  </Link>
                )}
              </div>
            </div>
          ) : (
             item.link && <Link href={item.link} className="absolute inset-0" />
          )}
        </div>
      ))}

      {/* Navigation Buttons */}
      {items.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/30 hover:bg-white/50 text-white backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/30 hover:bg-white/50 text-white backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100"
            aria-label="Next slide"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </>
      )}

      {/* Indicators */}
      {items.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex space-x-2">
          {items.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-3 h-3 rounded-full transition-all ${
                index === currentIndex ? 'bg-white w-8' : 'bg-white/50 hover:bg-white/80'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
