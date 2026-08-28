"use client"

import * as React from "react"
import { Check, ChevronRight, ChevronsUpDown, ArrowLeft, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useCategoriesQuery } from "@/src/hooks/useCategoriesQuery"
import { BackendCategory } from "@/lib/types/product"
import { useTranslation } from "@/src/context/I18nContext"
import { categoriesApi } from "@/src/api/productsApi"

export interface CategoryTreeSelectProps {
  value?: number | null
  onChange?: (categoryId: number) => void
  disabled?: boolean
  className?: string
  placeholder?: string
  preferredCategories?: BackendCategory[]
}

export function CategoryTreeSelect({
  value,
  onChange,
  disabled,
  className,
  placeholder,
  preferredCategories,
}: CategoryTreeSelectProps) {
  const { t, language } = useTranslation()
  const [open, setOpen] = React.useState(false)
  const [parentStack, setParentStack] = React.useState<BackendCategory[]>([])
  
  // The current parent we are viewing children for. null means we are at root.
  const currentParentId = parentStack.length > 0 ? parentStack[parentStack.length - 1].id : undefined
  const isRoot = currentParentId === undefined

  // We only use the hook for the currently active level to keep it simple,
  // or we can just fetch manually. Since we want loading states per level:
  const { data: categories = [], isLoading } = useCategoriesQuery(isRoot ? { isRoot: true } : { parentId: currentParentId })

  const sortedCategories = React.useMemo(() => {
    if (!isRoot || !preferredCategories || preferredCategories.length === 0) return categories;
    const prefIds = new Set(preferredCategories.map(c => c.id));
    const pref = categories.filter(c => prefIds.has(c.id));
    const others = categories.filter(c => !prefIds.has(c.id));
    return [...pref, ...others];
  }, [categories, isRoot, preferredCategories]);

  const [selectedCategory, setSelectedCategory] = React.useState<BackendCategory | null>(null)
  
  React.useEffect(() => {
    async function loadSelected() {
      if (value && (!selectedCategory || selectedCategory.id !== value)) {
        const found = categories.find(c => c.id === value)
        if (found) {
          setSelectedCategory(found)
        } else {
          try {
            const fetched = await categoriesApi.getCategoryById(value)
            setSelectedCategory(fetched)
          } catch (e) {
            console.error("Failed to fetch category by id", value, e)
          }
        }
      } else if (!value) {
        setSelectedCategory(null)
      }
    }
    loadSelected()
  }, [value, categories, selectedCategory])

  const getCatName = (cat: BackendCategory) => {
    switch (language) {
      case "uz": return cat.name_uz
      case "ru": return cat.name_ru
      case "en": return cat.name_en
      default: return cat.name_uz
    }
  }

  const handleSelect = (cat: BackendCategory) => {
    if (cat.isLeaf) {
      setSelectedCategory(cat)
      onChange?.(cat.id)
      setOpen(false)
    } else {
      setParentStack([...parentStack, cat])
    }
  }

  const handleBack = () => {
    setParentStack(parentStack.slice(0, -1))
  }

  return (
    <Popover open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen)
    }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          {selectedCategory ? getCatName(selectedCategory) : (value ? t('productForm.categoryN', { n: value }) : placeholder || t('productForm.selectCategory'))}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          {parentStack.length > 0 && (
            <div className="flex items-center px-3 py-2 border-b">
              <Button variant="ghost" size="icon" className="h-6 w-6 mr-2" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium truncate">
                {getCatName(parentStack[parentStack.length - 1])}
              </span>
            </div>
          )}
          <CommandInput placeholder={t('productForm.searchCategory')} />
          <CommandList>
            <CommandEmpty>{t('productForm.noCategoriesFound')}</CommandEmpty>
            <CommandGroup>
              {isLoading ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                sortedCategories.map((category) => (
                  <CommandItem
                    key={category.id}
                    value={getCatName(category)}
                    onSelect={() => handleSelect(category)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === category.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {getCatName(category)}
                    {!category.isLeaf && (
                      <ChevronRight className="ml-auto h-4 w-4 opacity-50" />
                    )}
                  </CommandItem>
                ))
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
