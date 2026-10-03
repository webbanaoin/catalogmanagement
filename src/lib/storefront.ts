export type PublicPriceType = "FIXED" | "STARTING_FROM" | "ASK_PRICE";
export type PublicAvailability = "IN_STOCK" | "OUT_OF_STOCK" | "ON_REQUEST";

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

export function formatInr(value: number): string {
  return inrFormatter.format(value);
}

export function availabilityLabel(value: PublicAvailability): string {
  switch (value) {
    case "IN_STOCK":
      return "In stock";
    case "OUT_OF_STOCK":
      return "Out of stock";
    case "ON_REQUEST":
      return "Available on request";
  }
}

export function normalizeIndianWhatsAppNumber(value: string): string | null {
  const digits = value.replace(/\D/g, "");

  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    return `91${digits}`;
  }

  if (digits.length === 12 && digits.startsWith("91") && /^[6-9]/.test(digits.slice(2))) {
    return digits;
  }

  return null;
}

export function whatsappHref(value: string, message?: string): string | null {
  const number = normalizeIndianWhatsAppNumber(value);
  if (!number) return null;

  const url = new URL(`https://wa.me/${number}`);
  if (message) url.searchParams.set("text", message);
  return url.toString();
}

export function telephoneHref(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return `tel:${trimmed.replace(/[^+0-9]/g, "")}`;
}
