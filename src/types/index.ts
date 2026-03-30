export type UserRole = 'customer' | 'admin' | 'staff' | 'superadmin'

export type OrderType = 'table_service' | 'bar_pickup' | 'bar_service'
export type OrderStatus = 'pending' | 'accepted' | 'preparing' | 'ready' | 'delivered' | 'completed' | 'cancelled'
export type PaymentMethod = 'cash' | 'card' | 'app'

export interface Profile {
  id: string
  email: string
  full_name: string
  avatar_url?: string
  role: UserRole
  phone?: string
  venue_id?: string
  loyalty_points: number
  created_at: string
}

export interface Venue {
  id: string
  name: string
  slug: string
  description?: string
  address: string
  city: string
  postal_code?: string
  latitude?: number
  longitude?: number
  phone?: string
  email?: string
  logo_url?: string
  cover_url?: string
  opening_hours: Record<string, { open: string; close: string; closed: boolean }>
  has_table_service: boolean
  has_bar_service: boolean
  has_kitchen: boolean
  has_reservations: boolean
  accepts_card: boolean
  accepts_cash: boolean
  accepts_app_payment: boolean
  has_loyalty_program: boolean
  has_vip_orders: boolean
  is_active: boolean
  is_open: boolean
  rating: number
  review_count: number
  owner_id: string
  created_at: string
}

export interface Table {
  id: string
  venue_id: string
  number: number
  name?: string
  capacity: number
  qr_code: string
  is_active: boolean
}

export interface MenuCategory {
  id: string
  venue_id: string
  name: string
  name_en?: string
  icon?: string
  sort_order: number
  is_active: boolean
}

export interface MenuItem {
  id: string
  venue_id: string
  category_id?: string
  name: string
  name_en?: string
  description?: string
  price: number
  image_url?: string
  allergens?: string[]
  tags?: string[]
  stock_quantity?: number
  stock_unit?: string
  low_stock_threshold?: number
  track_stock: boolean
  is_available: boolean
  is_featured: boolean
  sort_order: number
  category?: MenuCategory
}

export interface Order {
  id: string
  order_number: string
  venue_id: string
  table_id?: string
  customer_id?: string
  customer_name?: string
  order_type: OrderType
  status: OrderStatus
  payment_method?: PaymentMethod
  is_paid: boolean
  is_vip: boolean
  subtotal: number
  total: number
  notes?: string
  placed_at: string
  accepted_at?: string
  ready_at?: string
  delivered_at?: string
  completed_at?: string
  served_by?: string
  items?: OrderItem[]
  table?: Table
  customer?: Profile
}

export interface OrderItem {
  id: string
  order_id: string
  menu_item_id: string
  quantity: number
  unit_price: number
  total_price: number
  notes?: string
  menu_item?: MenuItem
}

export interface Review {
  id: string
  venue_id: string
  customer_id?: string
  rating: number
  comment?: string
  is_anonymous: boolean
  created_at: string
  customer?: Profile
}

export interface Promotion {
  id: string
  venue_id: string
  title: string
  description?: string
  discount_type: 'percentage' | 'fixed' | 'free_item'
  discount_value?: number
  valid_from?: string
  valid_until?: string
  valid_hours_from?: string
  valid_hours_until?: string
  is_active: boolean
}

export interface QuizQuestion {
  id: string
  question: string
  options: string[]
  correct_answer: number
  category: string
  difficulty: 'easy' | 'medium' | 'hard'
  language: string
}

export interface Notification {
  id: string
  recipient_id: string
  venue_id?: string
  title: string
  body: string
  type: string
  data?: Record<string, unknown>
  is_read: boolean
  created_at: string
}

export interface InventoryItem {
  id: string
  venue_id: string
  menu_item_id?: string
  item_name: string
  quantity: number
  unit: string
  low_threshold: number
  cost_per_unit?: number
  last_restocked_at?: string
}

export interface CartItem {
  menu_item: MenuItem
  quantity: number
  notes?: string
}

export interface VenueStats {
  total_orders: number
  total_revenue: number
  avg_order_value: number
  total_guests: number
}

export interface AppSetting {
  id: string
  theme_key: string
  updated_at: string
}
