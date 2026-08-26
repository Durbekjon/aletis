import type React from "react"
import type { Metadata, Viewport } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { Suspense } from "react"
import { AuthProvider } from "@/src/context/AuthContext"

import { QueryProvider } from "@/src/providers/QueryProvider"
import { I18nProvider } from "@/src/context/I18nContext"
import "./globals.css"

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}

export const metadata: Metadata = {
  title: "Aletis - Sales Assistant AI",
  description:
    "Build and manage your Telegram bot / Instagram Store with AI-powered product management, order tracking, and analytics.",
  generator: "Aletis",
  keywords: ["telegram bot", "instagram store", "e-commerce", "uzbekistan", "online store", "ai assistant"],
  metadataBase: new URL("https://www.aletis.me"),
  openGraph: {
    title: "Aletis - Sales Assistant AI",
    description: "Build and manage your Telegram bot / Instagram Store with AI-powered product management, order tracking, and analytics.",
    url: "https://www.aletis.me",
    siteName: "Aletis",
    images: ["/placeholder-logo.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Aletis - Sales Assistant AI",
    description: "Build and manage your Telegram bot / Instagram Store with AI-powered product management, order tracking, and analytics.",
    images: ["/placeholder-logo.png"],
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-SGFLRW3G1M"></script>
        <script dangerouslySetInnerHTML={{ __html: `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-SGFLRW3G1M');
        `}} />
      </head>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <Suspense fallback={null}>
          <I18nProvider>
            <QueryProvider>
              <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
                <AuthProvider>
                  {children}
                </AuthProvider>
              </ThemeProvider>
            </QueryProvider>
          </I18nProvider>
        </Suspense>
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
