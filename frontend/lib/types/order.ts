export interface Customer {
  id: string
  telegramId: string
  username?: string
  firstName?: string
  lastName?: string
  phoneNumber?: string
  email?: string
  createdAt: Date
  totalOrders: number
  totalSpent: number
}

export interface OrderItem {
  id: string
  productId: string
  productName: string
  productImage?: string
  variantId?: string
  variantName?: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

export interface OrderNote {
  id: string
  content: string
  createdBy: string
  createdAt: Date
  isInternal: boolean
}

export interface Order {
  id: string
  orderNumber: string
  customer: Customer
  items: OrderItem[]
  subtotal: number
  shippingCost: number
  tax: number
  discount: number
  total: number
  status: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded"
  paymentStatus: "pending" | "paid" | "failed" | "refunded"
  paymentMethod?: string
  shippingAddress?: {
    street: string
    city: string
    region: string
    postalCode: string
    country: string
  }
  trackingNumber?: string
  notes: OrderNote[]
  assignedTo?: string
  conversationId?: string
  createdAt: Date
  updatedAt: Date
  confirmedAt?: Date
  shippedAt?: Date
  deliveredAt?: Date
}

export type OrderStatus = Order["status"]
export type PaymentStatus = Order["paymentStatus"]
