"use client"

import { useState } from "react"

export default function ProductImageGallery({
  images,
  mainImage,
  title,
  selectedImageIndex,
  onImageChange,
}: {
  images: string[]
  mainImage: string
  title: string
  selectedImageIndex?: number
  onImageChange?: (index: number) => void
}) {
  const displayImages = Array.isArray(images) && images.length > 0 ? images : [mainImage]
  const [internalIndex, setInternalIndex] = useState(0)
  const activeIndex = (typeof selectedImageIndex === 'number' && selectedImageIndex >= 0 && selectedImageIndex < displayImages.length)
    ? selectedImageIndex
    : internalIndex

  const normalize = (src: string) => (src.startsWith("http") ? src : src.startsWith("/") ? src : `/${src}`)

  // 新增：大图查看开关
  const [isModalOpen, setIsModalOpen] = useState(false)

  const current = displayImages[activeIndex]

  return (
    <div>
      {/* 固定 800x800 视窗，移动端自适应方形 */}
      <div
        className="relative w-full overflow-hidden rounded-lg bg-white border flex items-center justify-center"
        style={{ maxWidth: 800, aspectRatio: '1 / 1' }}
        onClick={() => setIsModalOpen(true)}
      >
        <img src={normalize(current)} alt={title} className="max-w-full max-h-full object-contain cursor-zoom-in transition-transform duration-200" />
        <div className="absolute bottom-2 right-2 text-xs text-gray-600 bg-white/80 px-2 py-1 rounded">Click to enlarge</div>
      </div>

      {displayImages.length > 1 && (
        <div className="mt-4 grid grid-cols-4 gap-2">
          {displayImages.map((src, idx) => (
            <button
              key={idx}
              type="button"
              className={`relative rounded overflow-hidden border ${
                idx === activeIndex ? "ring-2 ring-blue-500" : "border-transparent"
              }`}
              onClick={() => {
                setInternalIndex(idx)
                onImageChange?.(idx)
              }}
              aria-label={`View image ${idx + 1}`}
            >
              <img src={normalize(src)} alt={`Thumbnail ${idx + 1}`} className="w-full h-24 object-contain bg-white" />
            </button>
          ))}
        </div>
      )}

      {/* 大图弹窗 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center" onClick={() => setIsModalOpen(false)}>
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <img src={normalize(current)} alt={title} className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-lg" />
            <button
              type="button"
              className="absolute -top-3 -right-3 bg-white rounded-full p-2 shadow hover:bg-gray-100"
              onClick={() => setIsModalOpen(false)}
              aria-label="Close preview"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
