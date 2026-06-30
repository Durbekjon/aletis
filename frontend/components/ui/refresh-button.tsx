"use client"

import * as React from "react"
import { Button, ButtonProps } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

interface RefreshButtonProps extends Omit<ButtonProps, "onClick"> {
  onClick?: () => void | Promise<void>
  isLoading?: boolean
  iconClassName?: string
  children?: React.ReactNode
}

export function RefreshButton({
  onClick,
  isLoading = false,
  iconClassName,
  className,
  children,
  disabled,
  ...props
}: RefreshButtonProps) {
  const [isClicking, setIsClicking] = React.useState(false)

  const handleClick = async () => {
    if (disabled || isLoading) return
    
    setIsClicking(true)
    try {
      await onClick?.()
    } finally {
      // Keep animation going for a bit even if loading is fast
      setTimeout(() => setIsClicking(false), 300)
    }
  }

  const isAnimating = isLoading || isClicking

  return (
    <Button
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={cn(
        "group relative overflow-hidden transition-all duration-200",
        "hover:bg-accent/80 active:scale-95",
        className
      )}
      {...props}
    >
      <RefreshCw
        className={cn(
          "h-4 w-4 mr-2 transition-all duration-300 ease-in-out",
          "group-hover:rotate-180",
          isAnimating && "animate-spin",
          iconClassName
        )}
      />
      {children || "Refresh"}
    </Button>
  )
}

