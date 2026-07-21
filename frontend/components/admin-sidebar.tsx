"use client"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Bot, LogOut, Sparkles, Wallet, Building2, Cpu } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuthContext } from "@/src/context/AuthContext"

const ADMIN_ROUTES = {
  AI_COST: "/admin/ai-cost",
  REVENUE: "/admin/revenue",
  ORGS: "/admin/orgs",
  JOBS: "/admin/jobs",
}

export function AdminSidebar() {
  const { logout, user } = useAuthContext()
  const pathname = usePathname()

  const menuItems = [
    { title: "AI Cost", url: ADMIN_ROUTES.AI_COST, icon: Sparkles },
    { title: "Revenue", url: ADMIN_ROUTES.REVENUE, icon: Wallet },
    { title: "Organizations", url: ADMIN_ROUTES.ORGS, icon: Building2 },
    { title: "Jobs", url: ADMIN_ROUTES.JOBS, icon: Cpu },
  ]

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-emerald-400" />
          <span className="font-semibold">Aletis Admin</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={pathname?.startsWith(item.url)}>
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="text-xs text-muted-foreground mb-2 truncate">{user?.email}</div>
        <SidebarMenuButton onClick={() => logout()} className="gap-2">
          <LogOut className="h-4 w-4" />
          <span>Log out</span>
        </SidebarMenuButton>
      </SidebarFooter>
    </Sidebar>
  )
}
