const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_PHONE_FORMAT = /^\+?[0-9()\s-]+$/;

function compactPhone(value: string): string | null {
  const trimmed = value.trim();

  if (!trimmed || !ALLOWED_PHONE_FORMAT.test(trimmed)) {
    return null;
  }

  const compact = trimmed.replace(/[()\s-]/g, "");

  if (compact.includes("+", 1)) {
    return null;
  }

  return compact;
}

function indianNationalNumber(value: string): string | null {
  const compact = compactPhone(value);

  if (!compact) {
    return null;
  }

  if (compact.startsWith("+91")) {
    return compact.slice(3);
  }

  if (compact.startsWith("+")) {
    return null;
  }

  return compact;
}

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

export function isValidIndianMobile(value: string): boolean {
  const nationalNumber = indianNationalNumber(value);
  return nationalNumber !== null && /^[6-9][0-9]{9}$/.test(nationalNumber);
}

export function isValidIndianPhone(value: string): boolean {
  const nationalNumber = indianNationalNumber(value);

  if (!nationalNumber) {
    return false;
  }

  return /^[0-9]{10}$/.test(nationalNumber) || /^0[0-9]{10}$/.test(nationalNumber);
}

export function isValidIndianPincode(value: string): boolean {
  return /^[1-9][0-9]{5}$/.test(value.trim());
}

export function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
