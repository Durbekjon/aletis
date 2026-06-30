import type React from "react"
import type { Metadata, Viewport } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { Suspense } from "react"
import { AuthProvider } from "@/src/context/AuthContext"
import { ProductSchemaProvider } from "@/src/context/ProductSchemaContext"
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
}

// Set the canonical base URL for metadata (update to your production URL)
export const metadataBase = new URL("https://Aletis.app")

// Add sensible Open Graph and Twitter defaults; per-page metadata should override these
export const defaultOpenGraph = {
  title: metadata.title,
  description: metadata.description,
  url: metadataBase.href,
  siteName: "Aletis",
  images: ["/placeholder-logo.png"],
  type: "website",
}

export const defaultTwitter = {
  card: "summary_large_image",
  title: metadata.title,
  description: metadata.description,
  images: ["/placeholder-logo.png"],
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
                  <ProductSchemaProvider>
                    {children}
                  </ProductSchemaProvider>
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
