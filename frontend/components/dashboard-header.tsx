import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Bell, Plus } from "lucide-react"

export function DashboardHeader() {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
       <SidebarTrigger className="-ml-1" /> 

      <div className="flex flex-1 items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">Dashboard</h1>
        </div>

        {/* <div className="flex items-center gap-2">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Quick Add
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="relative bg-transparent">
                <Bell className="h-4 w-4" />
                <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 text-xs">3</Badge>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium">New order received</p>
                  <p className="text-xs text-muted-foreground">Order #1234 from @username</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium">Low stock alert</p>
                  <p className="text-xs text-muted-foreground">iPhone 15 Pro has only 2 items left</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium">Bot stopped</p>
                  <p className="text-xs text-muted-foreground">Main store bot is offline</p>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div> */}
      </div>
    </header>
  )
}
