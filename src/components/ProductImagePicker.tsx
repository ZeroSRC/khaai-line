'use client'

import { useEffect, useState } from 'react'
import { useT } from '@/lib/i18n'

/**
 * Image picker for the product form. The parent owns the File and the existing URL;
 * this only renders the preview and reports picks.
 */
export function ProductImagePicker({
  file,
  existingUrl,
  onSelect,
  onRemove,
  error,
}: {
  file: File | null
  existingUrl?: string | null
  onSelect: (file: File) => void
  onRemove: () => void
  error?: string | null
}) {
  const t = useT()
  const [objectUrl, setObjectUrl] = useState<string | null>(null)

  // Blob URLs have to be revoked or they leak for the lifetime of the document.
  useEffect(() => {
    if (!file) {
      setObjectUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setObjectUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const preview = objectUrl ?? existingUrl ?? null

  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) onSelect(f)
    e.target.value = '' // let the same file be re-picked after a remove
  }

  return (
    <div className="bg-white rounded-3xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.07)]">
      <p className="text-xs font-bold text-gray-400 mb-3">{t('products.image')}</p>

      {preview ? (
        <div className="flex items-center gap-3">
          <img src={preview} alt="" className="w-20 h-20 rounded-2xl object-cover bg-gray-100 flex-shrink-0" />
          <div className="flex-1 flex flex-col gap-2">
            <label className="text-center text-xs font-semibold text-[#1877F2] bg-[#1877F2]/10 rounded-2xl py-2.5 cursor-pointer active:bg-[#1877F2]/20 transition-colors">
              {t('products.changeImage')}
              <input type="file" accept="image/*" className="hidden" onChange={handle} />
            </label>
            <button type="button" onClick={onRemove}
              className="text-xs font-semibold text-red-400 bg-red-50 rounded-2xl py-2.5 active:bg-red-100 transition-colors">
              {t('products.removeImage')}
            </button>
          </div>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center bg-gray-50 rounded-2xl h-28 cursor-pointer border-2 border-dashed border-gray-200 active:border-[#1877F2] transition-colors">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <path d="M21 15l-5-5L5 21"/>
          </svg>
          <p className="text-xs text-gray-400 mt-1.5">{t('products.addImage')}</p>
          <input type="file" accept="image/*" className="hidden" onChange={handle} />
        </label>
      )}

      {error && <p className="text-xs text-red-500 mt-2 text-center">{error}</p>}
    </div>
  )
}
