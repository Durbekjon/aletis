"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ArrowLeft,
  Package,
  User,
  MapPin,
  MessageSquare,
  Clock,
  CheckCircle,
  Truck,
  Phone,
  Mail,
  Send,
  AlertCircle,
  Loader2,
} from "lucide-react"
import { useOrderDetail, useUpdateOrder } from "@/src/hooks/useOrderDetail"
import { OrderProduct, OrderStatus, PaymentStatus } from "@/src/api/ordersApi"
import { useToast } from "@/hooks/use-toast"

export default function OrderDetailPage() {
  const params = useParams()
  const { toast } = useToast()
  const orderId = parseInt(params.id as string)
  
  const { data: order, isLoading, error } = useOrderDetail(orderId)
  const updateOrderMutation = useUpdateOrder()
  
  const [newNote, setNewNote] = useState("")
  const [orderStatus, setOrderStatus] = useState<OrderStatus | undefined>()
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | undefined>()
  const [notes, setNotes] = useState("")
  const [notesChanged, setNotesChanged] = useState(false)

  // Initialize state when order data loads
  useEffect(() => {
    if (order) {
      setOrderStatus(order.status)
      setPaymentStatus(order.paymentStatus)
      setNotes(order.notes || "")
      setNotesChanged(false)
    }
  }, [order])

  // Handle API errors
  if (error) {
    toast({
      title: "Error",
      description: "Failed to load order details. Please try again.",
      variant: "destructive",
    })
  }

  const getStatusBadge = (status: OrderStatus) => {
    const statusConfig = {
      [OrderStatus.NEW]: { variant: "secondary" as const, icon: Clock, color: "text-gray-600" },
      [OrderStatus.PENDING]: { variant: "secondary" as const, icon: Clock, color: "text-yellow-600" },
      [OrderStatus.CONFIRMED]: { variant: "default" as const, icon: CheckCircle, color: "text-primary" },
      [OrderStatus.SHIPPED]: { variant: "default" as const, icon: Truck, color: "text-blue-600" },
      [OrderStatus.DELIVERED]: { variant: "default" as const, icon: CheckCircle, color: "text-teal-600" },
      [OrderStatus.CANCELLED]: { variant: "destructive" as const, icon: Clock, color: "text-red-600" },
      [OrderStatus.REFUNDED]: { variant: "outline" as const, icon: Clock, color: "text-red-600" },
    }

    const config = statusConfig[status]
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}
      </Badge>
    )
  }

  const getPaymentBadge = (paymentStatus: PaymentStatus) => {
    switch (paymentStatus) {
      case PaymentStatus.PAID:
        return <Badge className="bg-primary">Paid</Badge>
      case PaymentStatus.PENDING:
        return <Badge variant="secondary">Pending</Badge>
      case PaymentStatus.FAILED:
        return <Badge variant="destructive">Failed</Badge>
      case PaymentStatus.REFUNDED:
        return <Badge variant="outline">Refunded</Badge>
      default:
        return <Badge variant="secondary">{paymentStatus}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (newStatus !== order?.status) {
      try {
        await updateOrderMutation.mutateAsync({
          orderId,
          updateData: { orderStatus: newStatus }
        })
        toast({
          title: "Success",
          description: "Order status updated successfully",
        })
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to update order status",
          variant: "destructive",
        })
      }
    }
  }

  const handlePaymentStatusChange = async (newPaymentStatus: PaymentStatus) => {
    if (newPaymentStatus !== order?.paymentStatus) {
      try {
        await updateOrderMutation.mutateAsync({
          orderId,
          updateData: { paymentStatus: newPaymentStatus }
        })
        toast({
          title: "Success",
          description: "Payment status updated successfully",
        })
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to update payment status",
          variant: "destructive",
        })
      }
    }
  }

  const handleNotesChange = (value: string) => {
    setNotes(value)
    setNotesChanged(value !== (order?.notes || ""))
  }

  const handleSaveNotes = async () => {
    try {
      await updateOrderMutation.mutateAsync({
        orderId,
        updateData: { notes }
      })
      toast({
        title: "Success",
        description: "Notes updated successfully",
      })
      setNotesChanged(false)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update notes",
        variant: "destructive",
      })
    }
  }

  const handleAddNote = () => {
    if (newNote.trim()) {
      // TODO: Add note to order
      console.log("Adding note:", newNote)
      setNewNote("")
    }
  }

  const getProductImage = (product: OrderProduct) => {
    if (product.images && product.images.length > 0) {
      return product.images[0].url
    }
    return "/placeholder.svg?height=60&width=60"
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/orders">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Orders
            </Link>
          </Button>
          <div>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
            ) : error ? (
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-red-600">Error Loading Order</h1>
                <p className="text-muted-foreground">Failed to load order details</p>
              </div>
            ) : (
              <>
                <h1 className="text-3xl font-bold tracking-tight">{order?.orderNumber}</h1>
                <p className="text-muted-foreground">Order details and management</p>
              </>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Print</Button>
          {/* <Button>Contact Customer</Button> */}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                      <Skeleton className="h-15 w-15 rounded-md" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-3 w-12" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-24" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Failed to Load Order</h3>
              <p className="text-muted-foreground mb-4">There was an error loading the order details.</p>
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : order ? (
        <div className="grid gap-6 lg:grid-cols-3 items-start auto-rows-auto">

          {/* Order Items */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                    {order.orderItems.map((item) => (
                  <Link key={item.id} href={`/products/${item.product.id}`}>
                  <div key={item.id} className="flex items-center my-2 gap-4 p-4 border rounded-lg">
                    <img
                      src={getProductImage(item.product)}
                      alt={item.product.name}
                      className="h-15 w-15 rounded-md object-cover"
                    />
                    <div className="flex-1">
                      <h4 className="font-medium">{item.product.name}</h4>
                      <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${item.price * item.quantity}</p>
                      <p className="text-sm text-muted-foreground">${item.price} each</p>
                    </div>
                  </div>
                  </Link>
                ))}

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between px-4">
                    <span>Subtotal</span>
                    <span>${order.totalPrice}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-semibold px-4">
                    <span>Total</span>
                    <span>${order.totalPrice}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Status & Actions */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Order Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Current Status</span>
                  {orderStatus && getStatusBadge(orderStatus)}
                </div>

                <div className="space-y-2">
                  <Select 
                    value={orderStatus} 
                    onValueChange={(value) => {
                      setOrderStatus(value as OrderStatus)
                      handleStatusChange(value as OrderStatus)
                    }}
                    disabled={updateOrderMutation.isPending}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={OrderStatus.NEW}>New</SelectItem>
                      <SelectItem value={OrderStatus.PENDING}>Pending</SelectItem>
                      <SelectItem value={OrderStatus.CONFIRMED}>Confirmed</SelectItem>
                      <SelectItem value={OrderStatus.SHIPPED}>Shipped</SelectItem>
                      <SelectItem value={OrderStatus.DELIVERED}>Delivered</SelectItem>
                      <SelectItem value={OrderStatus.CANCELLED}>Cancelled</SelectItem>
                      <SelectItem value={OrderStatus.REFUNDED}>Refunded</SelectItem>
                    </SelectContent>
                  </Select>
                  {updateOrderMutation.isPending && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Updating...
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Payment Status</label>
                  <Select 
                    value={paymentStatus} 
                    onValueChange={(value) => {
                      setPaymentStatus(value as PaymentStatus)
                      handlePaymentStatusChange(value as PaymentStatus)
                    }}
                    disabled={updateOrderMutation.isPending}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={PaymentStatus.PENDING}>Pending</SelectItem>
                      <SelectItem value={PaymentStatus.PAID}>Paid</SelectItem>
                      <SelectItem value={PaymentStatus.FAILED}>Failed</SelectItem>
                      <SelectItem value={PaymentStatus.REFUNDED}>Refunded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Notes</label>
                  <Textarea
                    value={notes}
                    defaultValue={order.notes || ""}
                    onChange={(e) => handleNotesChange(e.target.value)}
                    placeholder="Add notes about this order..."
                    rows={3}
                  />
                  {notesChanged && (
                    <Button 
                      size="sm" 
                      onClick={handleSaveNotes}
                      disabled={updateOrderMutation.isPending}
                      className="w-full"
                    >
                      {updateOrderMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Notes"
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Customer Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="rounded-md">
                      {order.customer.name?.split(' ').map((name) => name[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{order.customer.name}</p>
                    {order.customer.username && (
                      <p className="text-sm text-muted-foreground">
                        <a href={`https://t.me/${order.customer.username}`} target="_blank" rel="noopener noreferrer">
                          @{order.customer.username}
                        </a>
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Telegram ID:</span>
                    <span className="font-mono">{order.customer.telegramId}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Phone Number:</span>
                    <span className="font-mono">{order.details?.phoneNumber}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Location:</span>
                    <span className="font-mono">{order.details?.location}</span>
                      </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">notes:</span>
                    <span className="font-mono">{order.details?.notes}</span>
                  </div>
                </div>

                <Button variant="outline" size="sm" className="w-full bg-transparent">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  View Conversation
                </Button>
              </CardContent>
            </Card>

          </div>

          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Order Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Timeline */}
                <div className="space-y-4">
                  {/* <h4 className="font-medium">Timeline</h4> */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                        <Clock className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">Order Created</p>
                        <p className="text-muted-foreground">{formatDate(order.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
