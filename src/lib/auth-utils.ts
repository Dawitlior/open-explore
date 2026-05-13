export const PASSWORD_REQUIREMENTS = 'Password must be at least 6 characters.';

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login') || m.includes('invalid credentials')) return 'אימייל או סיסמה שגויים';
  if (m.includes('email not confirmed')) return 'האימייל עדיין לא אושר — בדוק/י את תיבת הדואר';
  if (m.includes('user already registered') || m.includes('already registered')) return 'כתובת האימייל כבר רשומה במערכת';
  if (m.includes('password should be at least')) return 'הסיסמה קצרה מדי — נדרשים לפחות 6 תווים';
  if (m.includes('unable to validate email') || m.includes('invalid email')) return 'כתובת האימייל לא תקינה';
  if (m.includes('signup') && m.includes('disabled')) return 'הרשמה אינה זמינה כרגע';
  if (m.includes('email rate limit exceeded')) return 'נשלחו יותר מדי אימיילים — נסה/י שוב מאוחר יותר';
  if (m.includes('same password')) return 'הסיסמה החדשה חייבת להיות שונה מהסיסמה הקודמת';
  if (m.includes('rate limit') || m.includes('too many')) return 'יותר מדי נסיונות — נסה/י שוב בעוד כמה דקות';
  if (m.includes('network') || m.includes('failed to fetch')) return 'בעיית חיבור זמנית — נסה/י שוב';
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

/** Simplified — no complexity rules, only minimum length of 6. */
export function evaluatePassword(pw: string): PasswordStrength {
  const len = pw.length;
  const hints: string[] = [];
  if (len === 0) return { score: 0, label: '', color: '#3a4a66', hints };
  if (len < 6) {
    hints.push('At least 6 characters');
    return { score: 1, label: 'Too short', color: '#ef4444', hints };
  }
  if (len < 8) return { score: 2, label: 'OK', color: '#f59e0b', hints };
  if (len < 12) return { score: 3, label: 'Good', color: '#10b981', hints };
  return { score: 4, label: 'Strong', color: '#22d3ee', hints };
}
