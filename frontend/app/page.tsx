"use client"

import React, { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowRight,
  Bot,
  ShoppingCart,
  BarChart3,
  Users,
  Zap,
  Shield,
  TrendingUp,
  CheckCircle2,
  Sparkles,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useTranslation } from "@/src/context/I18nContext"
import { LanguageSwitcher } from "@/components/language-switcher"

function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("lp-visible")
        })
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    )
    document.querySelectorAll(".lp-reveal").forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])
}

export default function HomePage() {
  const { t } = useTranslation()
  useScrollReveal()

  const renderHeroTitle = () => {
    const title = t("home.heroTitle")
    const highlight = t("home.heroTitleHighlight")
    if (title.includes(highlight)) {
      const parts = title.split(highlight)
      return (
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-[1.05] tracking-tight">
          {parts.map((part, index) => (
            <React.Fragment key={index}>
              {part}
              {index < parts.length - 1 && (
                <span className="lp-gradient-text">{highlight}</span>
              )}
            </React.Fragment>
          ))}
        </h1>
      )
    }
    return (
      <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-[1.05] tracking-tight">
        {title} <span className="lp-gradient-text">{highlight}</span>
      </h1>
    )
  }

  const features = [
    { icon: Bot, title: t("home.smartBotManagement"), desc: t("home.smartBotDescription") },
    { icon: ShoppingCart, title: t("home.productManagement"), desc: t("home.productManagementDescription") },
    { icon: BarChart3, title: t("home.analyticsReports"), desc: t("home.analyticsReportsDescription") },
    { icon: Users, title: t("home.teamCollaboration"), desc: t("home.teamCollaborationDescription") },
    { icon: Shield, title: t("home.securePayments"), desc: t("home.securePaymentsDescription") },
    { icon: Zap, title: t("home.quickSetup"), desc: t("home.quickSetupDescription") },
  ]

  const steps = [
    {
      num: "01",
      icon: Bot,
      title: "Bot ulang",
      desc: "Telegram bot tokenini kiriting — 2 daqiqada tayyor",
    },
    {
      num: "02",
      icon: ShoppingCart,
      title: "Katalog to'ldiring",
      desc: "Mahsulotlar qo'shing, AI tavsiflarni avtomatik yozadi",
    },
    {
      num: "03",
      icon: TrendingUp,
      title: "Savdo boshlang",
      desc: "Mijozlar yozadi, AI sotadi — siz faqat buyurtma qabul qilasiz",
    },
  ]

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      {/* ── Animated background orbs ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="lp-orb lp-orb-1" />
        <div className="lp-orb lp-orb-2" />
        <div className="lp-orb lp-orb-3" />
      </div>

      {/* ── Sticky glass navbar ── */}
      <header className="fixed top-0 left-0 right-0 z-50 lp-glass border-b border-border/40 max-w-[1200px] mx-auto mt-3 rounded-full">
        <div className="container max-w-6xl mx-auto px-4 md:px-0 flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Image
              src="/images/aletis-logo.jpg"
              alt="aletis logo"
              width={28}
              height={28}
              className="rounded-md"
            />
            <Link href="/" className="text-lg font-bold tracking-tight">Aletis</Link>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="#features"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("home.features")}
            </Link>
            <Link
              href="#how"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Qanday ishlaydi
            </Link>
            <Link
              href="#pricing"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("home.pricing")}
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">{t("home.login")}</Link>
            </Button>
            <Button size="sm" className="lp-glow-btn" asChild>
              <Link href="/register">{t("home.tryFree")}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10 pt-16">
        {/* ══════════════════════
            HERO
           ══════════════════════ */}
        <section className="py-24 md:py-32 px-4">
          <div className="container max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-[1.1fr,0.9fr] gap-16 xl:gap-24 items-center">
              {/* Left — text */}
              <div>
                <Badge className="lp-glass mb-6 text-primary border-primary/20 px-3 py-1 rounded-full gap-1.5">
                  <Sparkles className="h-3 w-3" />
                  {t("home.aiPoweredEcommerce")}
                </Badge>

                {renderHeroTitle()}

                <p className="text-lg text-muted-foreground mb-8 leading-relaxed max-w-xl">
                  {t("home.heroDescription")}
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button size="lg" className="lp-glow-btn" asChild>
                    <Link href="/register">
                      {t("home.startFreeTrial")}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" className="lp-glass" asChild>
                    <Link href="https://www.youtube.com/channel/UCf83aU8RW_LSPvGCtvVPWqA">
                      {t("home.watchDemo")}
                    </Link>
                  </Button>
                </div>

                {/* Mini stats row */}
                <div className="flex gap-10 mt-10 pt-8 border-t border-border/40">
                  {[
                    { val: "500+", label: "Bizneslar" },
                    { val: "24/7", label: "AI ishlaydi" },
                    { val: "3x", label: "Ko'proq savdo" },
                  ].map((s) => (
                    <div key={s.label}>
                      <div className="text-2xl font-bold text-primary">{s.val}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right — live bot mockup */}
              <div className="relative hidden lg:block">
                {/* Ambient glow behind card */}
                <div className="absolute inset-6 bg-primary/20 blur-3xl rounded-full pointer-events-none" />

                <div className="relative lp-glass rounded-3xl p-5 shadow-2xl">
                  {/* Chat header */}
                  <div className="flex items-center gap-2.5 mb-4 pb-3.5 border-b border-border/40">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary lp-pulse" />
                    <span className="text-sm font-semibold">Aletis Bot</span>
                    <div className="ml-auto flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <span className="text-xs text-muted-foreground">online</span>
                    </div>
                  </div>

                  {/* Animated chat messages */}
                  <div className="space-y-3 min-h-[230px]">
                    <div className="lp-msg flex justify-end">
                      <div className="bg-white/[0.08] rounded-2xl rounded-tr-sm px-3.5 py-2 text-sm max-w-[75%]">
                        iPhone 15 bormi? 📱
                      </div>
                    </div>

                    <div className="lp-msg flex gap-2 items-end">
                      <div className="w-7 h-7 rounded-full bg-primary/15 flex-shrink-0 flex items-center justify-center text-xs">
                        🤖
                      </div>
                      <div className="bg-primary/10 border border-primary/20 rounded-2xl rounded-bl-sm px-3.5 py-2 text-sm max-w-[75%]">
                        Ha! iPhone 15 128GB —{" "}
                        <span className="text-primary font-semibold">$850</span> 💰{" "}
                        Sotib olasizmi?
                      </div>
                    </div>

                    <div className="lp-msg flex justify-end">
                      <div className="bg-white/[0.08] rounded-2xl rounded-tr-sm px-3.5 py-2 text-sm">
                        Sotib olaman! 🛒
                      </div>
                    </div>

                    <div className="lp-msg flex gap-2 items-end">
                      <div className="w-7 h-7 rounded-full bg-primary/15 flex-shrink-0 flex items-center justify-center text-xs">
                        🤖
                      </div>
                      <div className="bg-primary/10 border border-primary/20 rounded-2xl rounded-bl-sm px-3.5 py-2 text-sm max-w-[75%]">
                        Ajoyib! Telefon raqamingizni yuboring 📞
                      </div>
                    </div>

                    <div className="lp-msg flex justify-end">
                      <div className="bg-white/[0.08] rounded-2xl rounded-tr-sm px-3.5 py-2 text-sm">
                        +998 90 123 45 67
                      </div>
                    </div>
                  </div>

                  {/* Live stats row */}
                  <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-border/40">
                    {[
                      { val: "24", label: "Buyurtmalar", color: "text-primary" },
                      { val: "$1.2k", label: "Daromad", color: "" },
                      { val: "+8", label: "Yangi", color: "" },
                    ].map((s) => (
                      <div key={s.label} className="lp-glass rounded-xl p-2.5 text-center">
                        <div
                          className={`text-base font-bold ${s.color}`}
                          style={
                            s.label === "Daromad"
                              ? { color: "var(--color-accent)" }
                              : undefined
                          }
                        >
                          {s.val}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {s.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════
            FEATURES
           ══════════════════════ */}
        <section id="features" className="py-24 px-4">
          <div className="container max-w-6xl mx-auto">
            <div className="text-center mb-16 lp-reveal">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                {t("home.everythingYouNeed")}
              </h2>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                {t("home.powerfulTools")}
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {features.map((f, i) => (
                <div
                  key={i}
                  className="lp-glass-card lp-reveal rounded-2xl p-6 group"
                  style={{ transitionDelay: `${i * 75}ms` }}
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 transition-all duration-300 group-hover:bg-primary/20 group-hover:scale-110">
                    <f.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════
            HOW IT WORKS
           ══════════════════════ */}
        <section id="how" className="py-24 px-4">
          <div className="container max-w-5xl mx-auto">
            <div className="text-center mb-16 lp-reveal">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Qanday ishlaydi?
              </h2>
              <p className="text-lg text-muted-foreground">
                3 oddiy qadam — va savdongiz avtomatik
              </p>
            </div>

            <div className="flex flex-col md:flex-row items-start gap-6 md:gap-0">
              {steps.map((step, i) => (
                <React.Fragment key={step.num}>
                  <div
                    className="flex-1 lp-reveal text-center px-4 md:px-6"
                    style={{ transitionDelay: `${i * 110}ms` }}
                  >
                    <div className="lp-step-num mb-3 select-none">{step.num}</div>
                    <div className="lp-glass-card rounded-2xl p-5">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                        <step.icon className="h-5 w-5 text-primary" />
                      </div>
                      <h3 className="font-semibold mb-1.5">{step.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                  {i < steps.length - 1 && (
                    <div className="lp-step-connector hidden md:block" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════
            CTA
           ══════════════════════ */}
        <section className="py-24 px-4">
          <div className="container max-w-2xl mx-auto lp-reveal">
            <div className="lp-cta-glow rounded-3xl p-12 md:p-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                {t("home.readyToStartSelling")}
              </h2>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                {t("home.joinThousands")}
              </p>
              <Button size="lg" className="lp-glow-btn" asChild>
                <Link href="/register">
                  {t("home.startYourFreeTrial")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* ══════════════════════
            FOOTER
           ══════════════════════ */}
        <footer className="border-t border-border/40 py-12 px-4">
          <div className="container max-w-6xl mx-auto">
            <div className="grid md:grid-cols-4 gap-8 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Image
                    src="/images/aletis-logo.jpg"
                    alt="aletis logo"
                    width={22}
                    height={22}
                    className="rounded"
                  />
                  <span className="font-bold">Aletis</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t("home.footerDescription")}
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-3 text-sm">{t("home.product")}</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>
                    <Link href="#features" className="hover:text-foreground transition-colors">
                      {t("home.features")}
                    </Link>
                  </li>
                  <li>
                    <Link href="#pricing" className="hover:text-foreground transition-colors">
                      {t("home.pricing")}
                    </Link>
                  </li>
                  <li>
                    <Link href="/docs" className="hover:text-foreground transition-colors">
                      {t("home.docs")}
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-3 text-sm">{t("home.company")}</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>
                    <Link href="/about" className="hover:text-foreground transition-colors">
                      {t("home.about")}
                    </Link>
                  </li>
                  <li>
                    <Link href="/contact" className="hover:text-foreground transition-colors">
                      {t("home.contact")}
                    </Link>
                  </li>
                  <li>
                    <Link href="/support" className="hover:text-foreground transition-colors">
                      {t("home.support")}
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-3 text-sm">{t("home.legal")}</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>
                    <Link href="/privacy" className="hover:text-foreground transition-colors">
                      {t("home.privacy")}
                    </Link>
                  </li>
                  <li>
                    <Link href="/terms" className="hover:text-foreground transition-colors">
                      {t("home.terms")}
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

            <div className="border-t border-border/40 pt-6 text-center text-sm text-muted-foreground">
              {t("home.copyright")}
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}
