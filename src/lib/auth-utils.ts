export const PASSWORD_REQUIREMENTS =
  'Password must include at least 8 characters, one uppercase letter (A-Z), one lowercase letter (a-z), one number (0-9), and one symbol (!@#$…).';

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login') || m.includes('invalid credentials')) return 'אימייל או סיסמה שגויים';
  if (m.includes('email not confirmed')) return 'האימייל עדיין לא אושר — בדוק/י את תיבת הדואר';
  if (m.includes('user already registered') || m.includes('already registered')) return 'כתובת האימייל כבר רשומה במערכת';
  if (m.includes('password should be at least')) return 'הסיסמה קצרה מדי — נדרשים לפחות 8 תווים';
  if (m.includes('unable to validate email') || m.includes('invalid email')) return 'כתובת האימייל לא תקינה';
  if (m.includes('signup') && m.includes('disabled')) return 'הרשמה אינה זמינה כרגע';
  if (m.includes('email rate limit exceeded')) return 'נשלחו יותר מדי אימיילים — נסה/י שוב מאוחר יותר';
  if (m.includes('same password')) return 'הסיסמה החדשה חייבת להיות שונה מהסיסמה הקודמת';
  if (m.includes('rate limit') || m.includes('too many')) return 'יותר מדי נסיונות — נסה/י שוב בעוד כמה דקות';
  if (m.includes('network') || m.includes('failed to fetch')) return 'בעיית חיבור זמנית — אם זה קורה בתצוגה המקדימה, נסה/י גם אחרי Publish';
  if (m.includes('provider') || m.includes('oauth') || m.includes('google')) return 'התחברות Google נכשלה — נסה/י שוב בעוד רגע';
  if (m.includes('weak password') || m.includes('pwned')) return 'הסיסמה חלשה מדי — בחר/י סיסמה חזקה יותר';
  return 'שגיאה: ' + message;
}

export type PasswordStrength = {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: string;
  hints: string[];
};

export function evaluatePassword(pw: string): PasswordStrength {
  const checks = {
    length: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    number: /[0-9]/.test(pw),
    symbol: /[^A-Za-z0-9]/.test(pw),
  };
  const passed = Object.values(checks).filter(Boolean).length;
  const hints: string[] = [];
  if (!checks.length) hints.push('At least 8 characters');
  if (!checks.upper) hints.push('One uppercase letter (A-Z)');
  if (!checks.lower) hints.push('One lowercase letter (a-z)');
  if (!checks.number) hints.push('One number (0-9)');
  if (!checks.symbol) hints.push('One symbol (!@#$…)');

  if (pw.length === 0) return { score: 0, label: '', color: '#3a4a66', hints };
  if (passed <= 2) return { score: 1, label: 'Weak', color: '#ef4444', hints };
  if (passed === 3) return { score: 2, label: 'Fair', color: '#f59e0b', hints };
  if (passed === 4) return { score: 3, label: 'Strong', color: '#10b981', hints };
  return { score: 4, label: 'Excellent', color: '#22d3ee', hints };
}