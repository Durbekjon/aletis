"use client"
import type React from "react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AdminSidebar } from "@/components/admin-sidebar"
import useAuth from "@/src/hooks/useAuth"
import { Skeleton } from "@/components/ui/skeleton"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { isAuthenticated, loading, user } = useAuth()
  const isStaff = user?.platformRole === "STAFF" || user?.platformRole === "SUPERADMIN"

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace("/login?next=/admin/ai-cost")
    } else if (!loading && isAuthenticated && !isStaff) {
      router.replace("/dashboard")
    }
  }, [loading, isAuthenticated, isStaff, router])

  if (loading || !isAuthenticated || !isStaff) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="h-6 w-40 mx-auto" />
          <Skeleton className="h-4 w-64 mx-auto" />
        </div>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <main className="flex-1 space-y-4 p-4 md:p-6 pt-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
