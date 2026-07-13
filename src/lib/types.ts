export type Plan = 'free' | 'pro'
export type MemberRole = 'owner' | 'staff' | 'finance'
export type SerialStatus = 'in_stock' | 'sold' | 'shipped' | 'delivered'
export type WarrantyStatus = 'pending' | 'active' | 'expiring_soon' | 'expired'
export type ShipmentStatus = 'pending' | 'shipped' | 'delivered'
export type SlipType = 'transfer' | 'cash' | null
export type ExpenseCategory = 'fuel' | 'shipping' | 'other'
/** ship = ต้องจัดส่ง (รอสร้างพัสดุ) · pickup = รับเอง/ส่งมือ (ไม่ต้องมีพัสดุ) */
export type DeliveryMethod = 'ship' | 'pickup'

export interface Shop {
  id: string
  slug: string
  name: string
  description: string | null
  logo_url: string | null
  line_oa_id: string | null
  owner_line_uid: string
  plan: Plan
  plan_expires_at: string | null
  default_warranty_days: number
  vat_enabled: boolean
  vat_rate: number
  tax_id: string | null
  created_at: string
}

export interface ShopMember {
  id: string
  shop_id: string
  line_uid: string
  display_name: string | null
  role: MemberRole
}

export interface Product {
  id: string
  shop_id: string
  name: string
  sku: string | null
  image_url: string | null
  sell_price: number
  cost_price: number
  stock: number
  has_serial: boolean
  warranty_days: number
  is_active: boolean
  created_at: string
  tags?: Tag[]
}

export interface Tag {
  id: string
  shop_id: string
  name: string
  color: string
}

export interface Customer {
  id: string
  shop_id: string
  line_uid: string | null
  name: string
  phone: string | null
  is_vip: boolean
  total_spent: number
  order_count: number
  last_order_at: string | null
}

export interface CustomerAddress {
  id: string
  shop_id: string
  customer_id: string | null
  recipient: string
  phone: string
  address: string
  district: string | null
  amphoe: string | null
  province: string
  postcode: string
  is_default: boolean
}

export interface Sale {
  id: string
  shop_id: string
  customer_id: string | null
  ref_number: string | null
  total_amount: number
  vat_amount: number
  slip_url: string | null
  slip_type: SlipType
  delivery_method: DeliveryMethod
  note: string | null
  created_at: string
  customer?: Customer
  items?: SaleItem[]
}

export interface SaleItem {
  id: string
  sale_id: string
  product_id: string
  serial_id: string | null
  quantity: number
  unit_price: number
  /** ต้นทุนต่อชิ้น ณ เวลาที่ขาย — snapshot ไว้ ไม่ขยับตาม products.cost_price ที่เปลี่ยนทีหลัง */
  unit_cost: number
  total_price: number
  product?: Product
}

export interface SerialNumber {
  id: string
  shop_id: string
  product_id: string
  serial_code: string
  status: SerialStatus
  warranty_starts_at: string | null
  warranty_ends_at: string | null
  warranty_status: WarrantyStatus
  product?: Product
}

export interface Purchase {
  id: string
  shop_id: string
  supplier: string | null
  ref_number: string | null
  total_amount: number
  slip_url: string | null
  note: string | null
  created_at: string
}

export interface Shipment {
  id: string
  shop_id: string
  sale_id: string | null
  tracking_number: string | null
  carrier: string | null
  shipping_cost: number
  status: ShipmentStatus
  shipped_at: string | null
  delivered_at: string | null
  created_at: string
}

export interface Expense {
  id: string
  shop_id: string
  category: ExpenseCategory
  amount: number
  note: string | null
  expense_date: string
}

export interface MonthlyReport {
  year: number
  month: number
  total_sales: number
  total_purchases: number
  total_expenses: number
  gross_profit: number
  net_profit: number
  order_count: number
}
