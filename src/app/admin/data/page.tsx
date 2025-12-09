'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  Database, 
  Download, 
  Upload, 
  AlertCircle,
  CheckCircle,
  ArrowLeft
} from 'lucide-react'

export default function DataManagement() {
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleExport = () => {
    // Trigger download
    window.location.href = '/api/admin/data/export'
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!confirm('导入数据将覆盖现有数据或添加新数据。建议先备份。确定要继续吗？')) {
      e.target.value = ''
      return
    }

    setImporting(true)
    setError(null)
    setImportResult(null)

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string)
        
        const response = await fetch('/api/admin/data/import', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(json)
        })

        const result = await response.json()
        
        if (response.ok) {
          setImportResult(result)
        } else {
          setError(result.error || '导入失败')
        }
      } catch (err) {
        console.error(err)
        setError('文件解析失败或格式错误')
      } finally {
        setImporting(false)
        e.target.value = '' // Reset input
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-md shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/admin" className="text-gray-600 hover:text-blue-600 mr-4">
                <ArrowLeft className="h-6 w-6" />
              </Link>
              <Database className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-semibold text-gray-900">数据管理</span>
            </div>
            <Link
              href="/admin"
              className="text-gray-600 hover:text-blue-600 transition-colors"
            >
              返回控制台
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">数据备份与恢复</h1>
          <p className="text-gray-600 mt-2">导出网站数据进行备份，或从备份文件恢复数据</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Export Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex items-center mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Download className="h-6 w-6 text-blue-600" />
              </div>
              <h2 className="ml-4 text-xl font-semibold text-gray-900">数据导出</h2>
            </div>
            <p className="text-gray-600 mb-6">
              下载所有产品和分类数据为 JSON 文件。建议定期备份数据。
            </p>
            <button
              onClick={handleExport}
              className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              <Download className="h-5 w-5 mr-2" />
              导出数据
            </button>
          </div>

          {/* Import Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex items-center mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Upload className="h-6 w-6 text-green-600" />
              </div>
              <h2 className="ml-4 text-xl font-semibold text-gray-900">数据导入</h2>
            </div>
            <p className="text-gray-600 mb-6">
              上传之前导出的 JSON 文件以恢复数据。现有数据如果 ID 相同将会被更新。
            </p>
            <label className={`w-full py-3 px-4 ${importing ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'} text-white rounded-lg font-medium transition-colors flex items-center justify-center cursor-pointer`}>
              {importing ? (
                 <>
                   <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                   正在导入...
                 </>
              ) : (
                 <>
                   <Upload className="h-5 w-5 mr-2" />
                   选择文件导入
                 </>
              )}
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                disabled={importing}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-3" />
            <div>
              <h3 className="text-red-800 font-medium">导入出错</h3>
              <p className="text-red-600 mt-1">{error}</p>
            </div>
          </div>
        )}

        {importResult && (
          <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3" />
            <div>
              <h3 className="text-green-800 font-medium">导入完成</h3>
              <div className="text-green-600 mt-1">
                <p>成功导入分类: {importResult.results.categories.success} (失败: {importResult.results.categories.failed})</p>
                <p>成功导入产品: {importResult.results.products.success} (失败: {importResult.results.products.failed})</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
