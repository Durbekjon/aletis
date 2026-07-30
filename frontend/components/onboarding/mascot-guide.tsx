import { AnimatePresence, motion } from "framer-motion"
import Image from "next/image"
import mascotImage from "@/src/assets/images/mascot.png"

interface MascotGuideProps {
  currentStep: number
}

// Map steps to speech bubble texts
const getMessage = (step: number) => {
  switch (step) {
    case 1:
      return "Salom! Aletisga xush kelibsiz! Keling, biznesingiz haqida gaplashamiz. Tashkilot nomini kiriting."
    case 2:
      return "Ajoyib! Endi biznesingiz yo'nalishini (kategoriyasini) tanlang."
    case 3:
      return "Juda yaxshi! Endi mahsulotlaringiz qanday ma'lumotlarga ega bo'lishi kerakligini (sxema) tuzamiz."
    case 4:
      return "Ajoyib, sxema tayyor! Endi birinchi mahsulotingizni qo'shib ko'raylik."
    case 5:
      return "Deyarli tugatdik! O'z Telegram botingizni ulashingiz mumkin."
    case 6:
      return "Hammasi tayyor! Boshqaruv paneliga o'tishimiz mumkin! 🎉"
    default:
      return "Salom! Biznesingizni boshlashga tayyormisiz?"
  }
}

export function MascotGuide({ currentStep }: MascotGuideProps) {
  const message = getMessage(currentStep)

  return (
    <div className="fixed left-0 top-0 z-[100] hidden lg:flex h-full w-[45%] flex-col items-center justify-center pointer-events-none">
      {/* Speech Bubble */}
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="relative mb-6 max-w-[340px] rounded-3xl bg-white/90 backdrop-blur-xl border border-white/50 p-6 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)] pointer-events-auto ml-16"
      >
        <AnimatePresence mode="wait">
          <motion.p
            key={currentStep}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.3 }}
            className="text-[17px] font-semibold leading-relaxed text-[#0f172a]"
          >
            {message}
          </motion.p>
        </AnimatePresence>
        
        {/* Triangle pointer for speech bubble */}
        <div className="absolute -bottom-3 right-20 h-6 w-6 rotate-45 rounded-sm bg-white/90 border-b border-r border-white/50 backdrop-blur-xl" />
      </motion.div>

      {/* Mascot Image */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ 
          y: [0, -10, 0], // Floating animation
          opacity: 1 
        }}
        transition={{ 
          y: {
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          },
          opacity: {
            duration: 0.8
          }
        }}
        className="pointer-events-auto relative"
      >
        {/* Glow behind mascot */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-[#00e9ae]/30 rounded-full blur-[80px]" />
        
        <Image 
          src={mascotImage} 
          alt="Aletis Mascot" 
          width={450}
          height={600}
          className="relative h-auto w-[360px] object-contain drop-shadow-[0_20px_40px_rgba(0,233,174,0.25)]"
        />
      </motion.div>
    </div>
  )
}
