import type { createSupabaseClient } from '@/lib/supabase'

type Client = ReturnType<typeof createSupabaseClient>

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // 5MB

/**
 * Upload a product image and return its public URL.
 *
 * Stored in the existing public `slips` bucket under a `products/` prefix rather than
 * a dedicated bucket — a new bucket would need to be created and given policies by hand
 * in the Supabase dashboard before any upload could work. Same shop-scoped path shape
 * the slip uploads already use.
 */
export async function uploadProductImage(sb: Client, shopId: string, file: File): Promise<string> {
  return upload(sb, `${shopId}/products`, file)
}

/** Upload a shop logo and return its public URL. Owner-only — enforced by RLS on `shops`. */
export async function uploadShopLogo(sb: Client, shopId: string, file: File): Promise<string> {
  return upload(sb, `${shopId}/logo`, file)
}

/** Upload a payment/expense slip and return its public URL. Same `slips/` prefix sales/purchases use. */
export async function uploadSlip(sb: Client, shopId: string, file: File): Promise<string> {
  return upload(sb, `${shopId}/slips`, file)
}

async function upload(sb: Client, dir: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${dir}/${Date.now()}.${ext}`

  const { error } = await sb.storage.from('slips').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })
  if (error) throw error

  return sb.storage.from('slips').getPublicUrl(path).data.publicUrl
}
