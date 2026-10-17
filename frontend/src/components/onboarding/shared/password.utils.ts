export const MIN_PASSWORD_LENGTH = 8;
const STRONG_PASSWORD_LENGTH = 12;

export interface PasswordStrength {
  score: number;
  label: string;
  barColor: string;
  textColor: string;
}

/** Ordered weakest → strongest; a password gets the first level whose maxScore covers its score. */
const STRENGTH_LEVELS: readonly (Omit<PasswordStrength, "score"> & { maxScore: number })[] = [
  { maxScore: 1, label: "Weak",        barColor: "bg-red-500",     textColor: "text-red-500" },
  { maxScore: 2, label: "Fair",        barColor: "bg-amber-400",   textColor: "text-amber-500" },
  { maxScore: 3, label: "Good",        barColor: "bg-yellow-400",  textColor: "text-yellow-600" },
  { maxScore: 4, label: "Strong",      barColor: "bg-emerald-400", textColor: "text-emerald-500" },
  { maxScore: 5, label: "Very strong", barColor: "bg-emerald-500", textColor: "text-emerald-500" },
];

export const MAX_PASSWORD_STRENGTH_SCORE = STRENGTH_LEVELS.length;

const STRENGTH_RULES: readonly ((password: string) => boolean)[] = [
  (password) => password.length >= MIN_PASSWORD_LENGTH,
  (password) => password.length >= STRONG_PASSWORD_LENGTH,
  (password) => /[A-Z]/.test(password),
  (password) => /[0-9]/.test(password),
  (password) => /[^A-Za-z0-9]/.test(password),
];

export function getPasswordStrength(password: string): PasswordStrength {
  const score = STRENGTH_RULES.filter((rule) => rule(password)).length;
  const level = STRENGTH_LEVELS.find((strengthLevel) => score <= strengthLevel.maxScore)
    ?? STRENGTH_LEVELS[STRENGTH_LEVELS.length - 1];
  return { score, label: level.label, barColor: level.barColor, textColor: level.textColor };
}

/** Client-side check before creating a password; returns the message to show, or null when valid. */
export function validateNewPassword(password: string, confirmPassword: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password !== confirmPassword) return "Passwords do not match.";
  return null;
}
