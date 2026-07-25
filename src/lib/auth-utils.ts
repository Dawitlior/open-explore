export function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('signup') && m.includes('disabled')) return 'הרשמה אינה זמינה כרגע';
  if (m.includes('rate limit') || m.includes('too many')) return 'יותר מדי נסיונות — נסה/י שוב בעוד כמה דקות';
  if (m.includes('network') || m.includes('failed to fetch')) return 'בעיית חיבור זמנית — נסה/י שוב';
  if (m.includes('popup') || m.includes('closed') || m.includes('cancel')) return 'ההתחברות בוטלה — נסה/י שוב';
  if (m.includes('provider') || m.includes('oauth') || m.includes('google')) return 'התחברות Google נכשלה — נסה/י שוב בעוד רגע';
  return 'שגיאה: ' + message;
}
