import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Maxfiylik siyosati — Aletis",
  description: "Aletis maxfiylik siyosati: qanday ma'lumotlar yig'iladi, qanday ishlatiladi va qanday himoyalanadi.",
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container max-w-3xl mx-auto px-4 py-16">
        <Link href="/" className="text-sm text-primary hover:underline">
          ← Bosh sahifaga qaytish
        </Link>

        <h1 className="text-3xl md:text-4xl font-bold mt-6 mb-2">Maxfiylik siyosati</h1>
        <p className="text-sm text-muted-foreground mb-10">Oxirgi yangilanish: 2026-yil</p>

        <div className="space-y-8 text-sm leading-relaxed text-muted-foreground [&_h2]:text-foreground [&_h2]:font-semibold [&_h2]:text-base [&_h2]:mb-2 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
          <section>
            <p>
              Ushbu sahifa Aletis ("biz", "xizmat") tomonidan taqdim etiladigan Telegram va Instagram
              orqali ishlaydigan AI-savdo botlari xizmatida foydalanuvchilar (tadbirkorlar) va ularning
              mijozlari ma'lumotlari qanday yig'ilishi, ishlatilishi va himoyalanishini tushuntiradi.
            </p>
          </section>

          <section>
            <h2>1. Qanday ma'lumotlar yig'iladi</h2>
            <ul>
              <li>Telegram/Instagram profil identifikatori, ismi va foydalanuvchi nomi (username)</li>
              <li>Mijoz botga yozgan xabarlar matni va buyurtma tafsilotlari</li>
              <li>Aloqa uchun taqdim etilgan telefon raqami va yetkazib berish manzili (agar mijoz o'zi kiritsa)</li>
              <li>Tadbirkor tomonidan yuklangan mahsulot ma'lumotlari (nom, narx, rasm, tavsif)</li>
              <li>Xizmatdan foydalanish statistikasi (buyurtmalar soni, suhbatlar soni va h.k.)</li>
            </ul>
          </section>

          <section>
            <h2>2. Ma'lumotlar qanday ishlatiladi</h2>
            <ul>
              <li>Mijozning savoliga AI yordamida javob berish va mahsulot qidirish</li>
              <li>Buyurtmalarni qabul qilish, qayta ishlash va tadbirkorga yetkazish</li>
              <li>Tadbirkor uchun boshqaruv panelida analitika va hisobotlar ko'rsatish</li>
              <li>Xizmat sifatini yaxshilash va texnik nosozliklarni bartaraf etish</li>
            </ul>
          </section>

          <section>
            <h2>3. Uchinchi tomon xizmatlari</h2>
            <p>Xizmatni ishga tushirish uchun quyidagi uchinchi tomon provayderlaridan foydalanamiz:</p>
            <ul>
              <li>Telegram Bot API va Meta (Instagram) Messaging API — xabar almashish uchun</li>
              <li>Google Gemini — AI javoblarni generatsiya qilish uchun</li>
              <li>ImageKit — mahsulot rasmlarini saqlash uchun</li>
            </ul>
            <p>
              Bu provayderlarga faqat xizmatni ko'rsatish uchun zarur bo'lgan ma'lumotlar uzatiladi;
              ular ma'lumotlarni boshqa maqsadda ishlatmaydi.
            </p>
          </section>

          <section>
            <h2>4. Ma'lumotlarni saqlash</h2>
            <p>
              Ma'lumotlar shifrlangan ulanish orqali uzatiladi va faqat xizmat ko'rsatish uchun zarur
              muddat davomida saqlanadi. Nozik ma'lumotlar (masalan, tashqi xizmatlarning access
              tokenlari) bazada shifrlangan holda saqlanadi.
            </p>
          </section>

          <section>
            <h2>5. Ma'lumotlarni o'chirish</h2>
            <p>
              Foydalanuvchi yoki mijoz o'z ma'lumotlarini o'chirishni so'rashi mumkin. So'rovni{" "}
              <a href="mailto:saydaliyevdurbek0512@gmail.com" className="text-primary hover:underline">
                saydaliyevdurbek0512@gmail.com
              </a>{" "}
              manziliga yuboring — biz uni oqilona muddatda bajaramiz.
            </p>
          </section>

          <section>
            <h2>6. Aloqa</h2>
            <p>
              Ushbu siyosat yuzasidan savollaringiz bo'lsa,{" "}
              <a href="mailto:saydaliyevdurbek0512@gmail.com" className="text-primary hover:underline">
                saydaliyevdurbek0512@gmail.com
              </a>{" "}
              orqali bog'laning.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
