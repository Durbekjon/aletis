"use client"

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useTranslation as useI18nextTranslation, I18nextProvider } from 'react-i18next'
import i18n from '@/lib/i18n/config'

interface I18nContextType {
  language: string
  changeLanguage: (lang: string) => Promise<void>
  availableLanguages: { code: string; name: string; nativeName: string }[]
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

export const availableLanguages = [
  { code: 'uz', name: 'Uzbek', nativeName: 'O\'zbek' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'en', name: 'English', nativeName: 'English' },
]

export function I18nProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const [currentLanguage, setCurrentLanguage] = useState<string>('uz')

  useEffect(() => {
    setMounted(true)
    // Initialize i18n on client side
    const savedLanguage = typeof window !== 'undefined' ? (localStorage.getItem('i18nextLng') || 'uz') : 'uz'
    setCurrentLanguage(savedLanguage)
    i18n.changeLanguage(savedLanguage)
  }, [])

  useEffect(() => {
    if (mounted && i18n.language) {
      setCurrentLanguage(i18n.language)
    }
  }, [mounted, i18n.language])

  const changeLanguage = async (lang: string) => {
    await i18n.changeLanguage(lang)
    setCurrentLanguage(lang)
    if (typeof window !== 'undefined') {
      localStorage.setItem('i18nextLng', lang)
    }
  }

  // Always provide the context, even during SSR
  const contextValue: I18nContextType = {
    language: mounted ? (i18n.language || currentLanguage) : currentLanguage,
    changeLanguage,
    availableLanguages,
  }

  return (
    <I18nextProvider i18n={i18n}>
      <I18nContext.Provider value={contextValue}>
        {children}
      </I18nContext.Provider>
    </I18nextProvider>
  )
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}

// Wrapper hook for useTranslation with type safety
export function useTranslation(namespace?: string) {
  const { t, i18n: i18nInstance } = useI18nextTranslation(namespace)
  return {
    t,
    i18n: i18nInstance,
    language: i18nInstance.language,
  }
}

