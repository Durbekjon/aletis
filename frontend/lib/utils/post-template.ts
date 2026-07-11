enum Currency {
  USD = 'USD',
  EUR = 'EUR',
  UZS = 'UZS',
  RUB = 'RUB',
  KZT = 'KZT',
  GBP = 'GBP',
  JPY = 'JPY',
}

function formatPrice(price: number, currency: Currency): string {
  // Valyuta belgilarini aniqlaymiz
  const symbols: Record<Currency, string> = {
    [Currency.USD]: '$',
    [Currency.EUR]: '€',
    [Currency.UZS]: "so'm",
    [Currency.RUB]: '₽',
    [Currency.KZT]: '₸',
    [Currency.GBP]: '£',
    [Currency.JPY]: '¥',
  };

  // Katta raqamlarni vergul bilan ajratamiz (masalan 1,234,567)
  const formattedNumber = price.toLocaleString('en-US', {
    maximumFractionDigits: 0, // kasr (decimal) kerak bo‘lmasa
  });

  // Belgini oldiga yoki orqasiga joylashtiramiz
  switch (currency) {
    case Currency.UZS:
    case Currency.KZT:
    case Currency.RUB:
      return `${formattedNumber} ${symbols[currency]}`; // 1 000 000 so'm
    default:
      return `${symbols[currency]}${formattedNumber}`; // $1,000,000
  }
}

export function generatePostContent(product: any): string {
  const fieldsText = product.fields
    ?.filter((field: any) => {
      // description fieldini skip qilamiz (alohida ko'rsatiladi yoki umuman ko'rsatilmaydi)
      if (field.fieldName?.toLowerCase() === 'description') {
        return false;
      }
      // null, undefined yoki bo'sh string bo'lsa skip
      const val = field.value;
      return val !== null && val !== undefined && String(val).trim() !== '';
    })
    .map((field: any) => `${field.fieldName}: ${field.value}`)
    .join('\n');

  // Description maydonini alohida olamiz (null bo'lsa ko'rsatmaymiz)
  const descriptionField = product.fields?.find(
    (f: any) => f.fieldName?.toLowerCase() === 'description'
  );
  const descriptionText =
    descriptionField?.value !== null &&
    descriptionField?.value !== undefined &&
    String(descriptionField.value).trim() !== ''
      ? String(descriptionField.value).trim()
      : null;

  const priceText = formatPrice(product.price, product.currency);

  const parts = [product.name];
  if (descriptionText) parts.push(descriptionText);
  if (fieldsText) parts.push(fieldsText);
  parts.push(priceText);

  return parts.join('\n');
}


export function formatPostDate(date: Date | undefined): string {
  if (!date) return "Not sent"
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}
