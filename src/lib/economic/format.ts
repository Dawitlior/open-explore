const IST_TZ = 'Asia/Jerusalem';

export function formatIST(iso: string, locale: 'he' | 'en' = 'he'): string {
  return new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-US', {
    timeZone: IST_TZ,
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: 'short',
  }).format(new Date(iso));
}

export function formatISTTime(iso: string, locale: 'he' | 'en' = 'he'): string {
  return new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-US', {
    timeZone: IST_TZ,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function minutesUntil(iso: string): number {
  return Math.round((new Date(iso).getTime() - Date.now()) / 60_000);
}
