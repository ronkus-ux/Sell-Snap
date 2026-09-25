/**
 * Converts an amount in kobo to a formatted Naira string: "₦ 12,000".
 * Always divide by 100 for display — never store or compute in naira.
 */
export function formatNaira(kobo: number): string {
  const naira = kobo / 100;
  const number = new Intl.NumberFormat('en-NG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(naira);
  return `₦\u00A0${number}`;
}

/**
 * Converts a Naira amount (as entered by the user) to kobo for storage.
 */
export function nairaToKobo(naira: number): number {
  return Math.round(naira * 100);
}

/**
 * Merges CSS class names, filtering out falsy values.
 * Lightweight alternative to clsx for CSS Modules usage.
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Formats a date for display in the dashboard.
 */
export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

/**
 * Formats a date with time for display in the dashboard (e.g. "6 May 2026, 15:30").
 */
export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(date));
}

/**
 * Truncates a string to a max length with ellipsis.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * Password policy rules. Returns the first failed rule's message,
 * or null when the password meets every requirement.
 */
export function validatePassword(password: string): string | null {
  const rules: { regex: RegExp; message: string }[] = [
    { regex: /[A-Z]/, message: 'Password must contain an uppercase letter.' },
    { regex: /[a-z]/, message: 'Password must contain a lowercase letter.' },
    { regex: /[^A-Za-z0-9]/, message: 'Password must contain a special character.' },
    { regex: /[0-9]/, message: 'Password must contain a number.' },
    { regex: /.{8,}/, message: 'Password must be at least 8 characters.' },
  ];
  for (const rule of rules) {
    if (!rule.regex.test(password)) return rule.message;
  }

  // bcrypt silently truncates input beyond 72 bytes — meaning two different
  // long passwords could produce the same hash. Cap by byte length (accounts
  // for multibyte characters, which simple string length would miss).
  if (new TextEncoder().encode(password).length > 72) {
    return 'Password must be at most 72 characters.';
  }

  return null;
}
