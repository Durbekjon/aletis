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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  // BarChart3,
  ShoppingCart,
  Package,
  // MessageSquare,
  Users,
  CreditCard,
  Settings,
  LayoutDashboard,
  ChevronUp,
  LogOut,
  // User,
  Newspaper,
  Bot,
  Repeat,
  PackageCheck,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ROUTES } from "@/lib/constants"
import Image from "next/image"
import { useAuthContext } from "@/src/context/AuthContext"
import { useUserQuery } from "@/src/hooks/useUser"
import { useTranslation } from "@/src/context/I18nContext"
// import { ThemeToggle } from "@/components/theme-toggle"

export function AppSidebar() {
  const { logout } = useAuthContext()
  const { data: user } = useUserQuery()
  const { t } = useTranslation()
  const pathname = usePathname()

  const menuItems = [
    {
      title: t("navigation.overview"),
      url: ROUTES.DASHBOARD,
      icon: LayoutDashboard,
    },
    {
      title: t("navigation.orders"),
      url: ROUTES.ORDERS,
      icon: ShoppingCart,
    },
    {
      title: t("navigation.customers"),
      url: ROUTES.CUSTOMERS,
      icon: Users,
    },
    {
      title: t("navigation.retention"),
      url: ROUTES.RETENTION,
      icon: Repeat,
    },
    {
      title: t("navigation.replenishment"),
      url: ROUTES.REPLENISHMENT,
      icon: PackageCheck,
    },
    {
      title: t("navigation.products"),
      url: ROUTES.PRODUCTS,
      icon: Package,
    },
    {
      title: t("navigation.posts"),
      url: ROUTES.POSTS,
      icon: Newspaper,
    },
    // {
    //   title: t("navigation.conversations"),
    //   url: ROUTES.CONVERSATIONS,
    //   icon: MessageSquare,
    // },
    // {
    //   title: t("navigation.analytics"),
    //   url: ROUTES.ANALYTICS,
    //   icon: BarChart3,
    // },
    {
      title: t("navigation.bots"),
      url: ROUTES.BOTS,
      icon: Bot, // Placeholder for future icon or component
    },
    // {
    //   title: t("navigation.team"),
    //   url: ROUTES.TEAM,
    //   icon: Users,
    // },
    {
      title: t("navigation.billing"),
      url: ROUTES.BILLING,
      icon: CreditCard,
    },
    {
      title: t("navigation.settings"),
      url: ROUTES.SETTINGS,
      icon: Settings,
    },
  ]

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  const getUserInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName?.charAt(0)}`.toUpperCase()
  }

  const getFullName = (firstName: string, lastName: string) => {
    return `${firstName} ${lastName || ""}`
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            <Image src="/images/aletis-logo.jpg" alt="aletis logo" width={32} height={32} className="rounded" />
            <span className="text-xl font-bold">Aletis</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = pathname === item.url || (item.url !== "/" && pathname.startsWith(item.url))
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.url}>
                        {item.icon && <item.icon className="h-4 w-4" />}
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    {user?.logo?.url ? (
                      <AvatarImage src={user.logo.url} />
                    ) : (
                      <AvatarFallback className="rounded-lg">
                        {user ? getUserInitials(user.firstName, user?.lastName) : "U"}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {user ? getFullName(user.firstName, user?.lastName) : "User"}
                    </span>
                    <span className="truncate text-xs">{user?.email || "user@example.com"}</span>
                  </div>
                  <ChevronUp className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                side="top"
                align="end"
                sideOffset={4}
                portalled={false}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      {user?.logo?.url ? (
                        <AvatarImage src={user.logo.url} />
                      ) : (
                        <AvatarFallback className="rounded-lg">
                          {user ? getUserInitials(user.firstName, user?.lastName) : "U"}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {user ? getFullName(user.firstName, user?.lastName) : "User"}
                      </span>
                      <span className="truncate text-xs">{user?.email || "user@example.com"}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {/* <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem> */}
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    {t("navigation.settings")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  {t("common.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
