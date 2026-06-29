import type React from "react"
import { LanguageSwitcher } from "@/components/language-switcher"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative bg-background overflow-hidden min-h-screen">
      {/* Animated background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="lp-orb lp-orb-1" />
        <div className="lp-orb lp-orb-2" />
        <div className="lp-orb lp-orb-3" />
      </div>

      {/* Fixed language switcher */}
      <div className="fixed top-4 right-4 z-50">
        <LanguageSwitcher />
      </div>

      {children}
    </div>
  )
}
