import type { ProductSchemaField } from "@/lib/types/product"

export type BarcodeAttr = "description" | "brandName" | "categoryName" | "unitName"

const KEYWORDS: Record<BarcodeAttr, string[]> = {
  description: ["description", "tavsif", "izoh", "описание"],
  brandName: ["brand", "brend", "бренд"],
  categoryName: ["category", "toifa", "turkum", "kategoriya", "категория"],
  unitName: ["unit", "birli", "o'lchov", "olchov", "единица"],
}

// Best-effort match between a barcode-catalog attribute and an org's dynamic
// schema field. Org schemas are arbitrary, so this is a heuristic, not a
// guarantee — used both to prefill from a resolved barcode and, in reverse, to
// read back what the merchant typed when completing an unresolved one.
export function findMatchingField(
  fields: ProductSchemaField[],
  attr: BarcodeAttr,
): ProductSchemaField | undefined {
  const keywords = KEYWORDS[attr]
  return fields.find((field) =>
    keywords.some((keyword) => field.name.toLowerCase().includes(keyword)),
  )
}
