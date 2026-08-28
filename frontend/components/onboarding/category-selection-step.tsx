"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import type { OnboardingData } from "@/lib/types/onboarding"
import { ArrowRight, Check, Loader2 } from "lucide-react"
import { useOnboardingContext } from "@/src/context/OnboardingContext"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "@/src/context/I18nContext"
import { BackendCategory } from "@/lib/types/product"
import { useCategoriesQuery } from "@/src/hooks/useCategoriesQuery"
import { cn } from "@/lib/utils"
import { categoriesApi } from "@/src/api/productsApi"

interface CategorySelectionStepProps {
  data: OnboardingData
  onUpdate: (data: Partial<OnboardingData>) => void
  onNext: () => void
}

export function CategorySelectionStep({ data, onUpdate, onNext }: CategorySelectionStepProps) {
  const { t, language } = useTranslation()
  const { updateCategory, error } = useOnboardingContext()
  const { toast } = useToast()

  const [selectedIds, setSelectedIds] = useState<number[]>(data.categoryIds || [])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data: rootCategories = [], isLoading } = useCategoriesQuery({ isRoot: true })

  const handleNext = async () => {
    if (selectedIds.length === 0) return
    if (isSubmitting) return

    setIsSubmitting(true)
    try {
      await updateCategory(selectedIds)
      
      // Fetch selected categories to pass to next step
      const selectedCategories = []
      for (const id of selectedIds) {
        const cat = rootCategories.find(c => c.id === id)
        if (cat) {
          selectedCategories.push(cat)
        } else {
          try {
            const fetched = await categoriesApi.getCategoryById(id)
            selectedCategories.push(fetched)
          } catch (e) {
            console.error("Failed to fetch selected category", id)
          }
        }
      }

      onUpdate({ categoryIds: selectedIds, categories: selectedCategories })
      onNext()
    } catch (error) {
      console.error("Failed to update category:", error)
      toast({
        title: "Error",
        description: "Failed to save category. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getCatName = (cat: BackendCategory) => {
    switch (language) {
      case "uz": return cat.name_uz
      case "ru": return cat.name_ru
      case "en": return cat.name_en
      default: return cat.name_uz
    }
  }

  const toggleCategory = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">{t('onboarding.selectCategory')}</h3>
        <p className="text-sm text-muted-foreground">
          {t('onboarding.selectCategoryDesc')}
        </p>
      </div>

      <Card className="border border-border/50 shadow-sm">
        <CardContent className="p-6">
          <div className="space-y-4">
            <Label className="text-sm font-medium text-foreground mb-2 block">
              {t('onboarding.mainCategory')}
            </Label>
            
            {isLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {rootCategories.map((cat) => {
                  const isSelected = selectedIds.includes(cat.id)
                  return (
                    <button
                      key={cat.id}
                      onClick={() => toggleCategory(cat.id)}
                      className={cn(
                        "flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all",
                        isSelected 
                          ? "border-primary bg-primary/10 ring-1 ring-primary" 
                          : "border-border hover:border-primary/50 hover:bg-muted"
                      )}
                    >
                      <span className="font-medium text-sm truncate pr-2">
                        {getCatName(cat)}
                      </span>
                      {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                    </button>
                  )
                })}
              </div>
            )}
            
            {selectedIds.length === 0 && !isLoading && (
              <p className="text-sm text-muted-foreground mt-2">
                Iltimos, kamida bitta kategoriyani tanlang.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="border-destructive/50">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-end pt-4">
        <Button 
          onClick={handleNext} 
          disabled={selectedIds.length === 0 || isSubmitting} 
          className="bg-[#00E6A8] hover:bg-[#00E6A8]/90 text-black font-medium px-8 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Saving...
            </>
          ) : (
            <>
              {t("onboarding.continue")}
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
