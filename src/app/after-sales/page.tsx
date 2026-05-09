'use client'
export const dynamic = 'force-dynamic'

import Layout from '@/components/Layout'
import { useSettings } from '@/lib/settings'

export default function AfterSalesPolicyPage() {
  const { settings, loading } = useSettings()
  const content = loading ? defaultAfterSalesPolicy() : settings.afterSalesPolicy
  const paragraphs = content.split('\n').filter(p => p.trim().length)

  return (
    <Layout>
      <div className="bg-white">
        <div className="relative bg-gradient-to-br from-blue-50 to-indigo-100 py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                After-Sales Policy
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600">
                Review our standard support, returns, and warranty assistance process.
              </p>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <div className="prose prose-lg prose-blue mx-auto">
              <h2>Support Scope</h2>
              {paragraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}

              <h2>How To Request Service</h2>
              <ul>
                <li>Contact our support team with your order number and product details.</li>
                <li>Share photos or videos if the product arrives damaged or develops a fault.</li>
                <li>Keep original packaging and accessories if a return or exchange is required.</li>
              </ul>

              <h2>Possible Resolutions</h2>
              <ul>
                <li>Troubleshooting guidance for setup or usage issues.</li>
                <li>Replacement parts, product exchange, or refund when approved.</li>
                <li>Warranty review based on product condition and order verification.</li>
              </ul>

              <h2>Contact</h2>
              <p>
                For after-sales assistance, email us at {loading ? 'contact@yourbrand.com' : settings.contactEmail}.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

function defaultAfterSalesPolicy() {
  return 'We are committed to providing dependable after-sales support. If you receive a damaged, defective, or incorrect item, please contact us within 7 days of delivery with your order details and photos when applicable.\n\nEligible issues may be resolved through troubleshooting guidance, replacement parts, a product exchange, or a refund depending on the situation and product condition.\n\nItems returned for inspection should be sent back in their original packaging whenever possible. Products that show misuse, unauthorized modification, or damage caused after delivery may not qualify for after-sales service.\n\nFor warranty-related requests, please include your order number, a description of the issue, and any supporting images or videos so our team can review and assist promptly.'
}
