"use client"

import * as React from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Globe } from "lucide-react"
import { useI18n, availableLanguages } from "@/src/context/I18nContext"
import { useState, useEffect } from "react"

export function LanguageSwitcher() {
  const { language, changeLanguage } = useI18n()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const currentLanguage = availableLanguages.find((lang) => lang.code === language) || availableLanguages[0]

  if (!mounted) {
    return (
      <Button variant="ghost" size="sm" className="gap-2" disabled>
        <Globe className="h-4 w-4" />
        <span className="hidden sm:inline">...</span>
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Globe className="h-4 w-4" />
          {/* <span className="hidden sm:inline">{currentLanguage.nativeName}</span> */}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {availableLanguages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            className={language === lang.code ? "bg-accent" : ""}
          >
            <span className="font-medium">{lang.nativeName}</span>
            <span className="ml-2 text-xs text-muted-foreground">({lang.name})</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

