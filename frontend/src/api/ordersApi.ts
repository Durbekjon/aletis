import axiosInstance from "./client"

export enum OrderStatus {
  NEW = "NEW",
  PENDING = "PENDING", 
  CONFIRMED = "CONFIRMED",
  SHIPPED = "SHIPPED",
  DELIVERED = "DELIVERED",
  CANCELLED = "CANCELLED",
  REFUNDED = "REFUNDED"
}

export enum PaymentStatus {
  PENDING = "PENDING",
  PAID = "PAID", 
  FAILED = "FAILED",
  REFUNDED = "REFUNDED"
}

export interface OrderCustomer {
  id: number
  name: string
  username?: string
  telegramId: string
}

export interface OrderDetails {
  name: string
  items: Array<{
    price: number
    quantity: number
    productId: number
  }>
  notes: string
  source: string
  location: string
  createdAt: string
  phoneNumber: string
}

export interface ProductImage {
  id: number
  key: string
  originalName: string
}

export interface OrderProduct {
  id: number
  name: string
  price: number
  currency: string
  images: ProductImage[]
}

export interface OrderItem {
  id: number
  orderId: number
  productId: number
  quantity: number
  price: number
  product: OrderProduct
}

export interface Order {
  id: number
  orderNumber: string
  createdAt: string
  status: OrderStatus
  paymentStatus: PaymentStatus
  customer: OrderCustomer
  details: OrderDetails
  organizationId: number
  totalPrice: number
  products: any[]
  orderItems: OrderItem[]
  notes: string | undefined
}

export interface OrdersResponse {
  items: Order[]
  total: number
  page: number
  limit: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
}

export interface OrdersQueryParams {
  page?: number
  limit?: number
  search?: string
  status?: OrderStatus
  paymentStatus?: PaymentStatus
}

export interface UpdateOrderDto {
  orderStatus?: OrderStatus
  paymentStatus?: PaymentStatus
  notes?: string
}

export const ordersApi = {
  async getOrders(params: OrdersQueryParams = {}): Promise<OrdersResponse> {
    const { data } = await axiosInstance.get<OrdersResponse>("/v1/orders", { params })
    return data
  },

  async getOrderById(id: number): Promise<Order> {
    const { data } = await axiosInstance.get<Order>(`/v1/orders/${id}`)
    return data
  },

  async updateOrder(orderId: number, updateData: UpdateOrderDto): Promise<Order> {
    const { data } = await axiosInstance.patch<Order>(`/v1/orders/${orderId}`, updateData)
    return data
  },
}

export default ordersApi
