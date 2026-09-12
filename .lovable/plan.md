# ערוץ אבטחה בהגדרות: אימות דו-שלבי + מכשירים מחוברים

## מה המשתמש יקבל

בקטגוריה **אישי (Personal)** בהגדרות יתווסף ערוץ חדש — **אבטחה (Security)** — עם שני חלקים:

### 1. אימות דו-שלבי (Google Authenticator)
- כפתור "הפעל אימות דו-שלבי" → נפתח חלון עם קוד QR + מפתח טקסטואלי להעתקה.
- המשתמש סורק ב-Google Authenticator (או Authy / 1Password — כל אפליקציית TOTP), מזין קוד בן 6 ספרות, וההפעלה מאומתת בשרת.
- לאחר ההפעלה מוצגים **קודי גיבוי** חד-פעמיים (10 קודים) להורדה/העתקה — למקרה של אובדן טלפון, בדיוק כמו בבורסות.
- כיבוי האימות דורש קוד תקף מהאפליקציה.
- **אכיפה בכניסה**: מי שהפעיל 2FA — אחרי התחברות עם Google ייחסם מסך הפלטפורמה עד הזנת קוד בן 6 ספרות (או קוד גיבוי). ללא הקוד אין גישה לנתונים.

### 2. מכשירים וסשנים פעילים
- טבלה של כל המכשירים שהתחברו לחשבון: סוג מכשיר ומערכת הפעלה, דפדפן, מיקום משוער (עיר/מדינה לפי IP), כניסה ראשונה, פעילות אחרונה, וסימון "המכשיר הנוכחי".
- כפתור **נתק מכשיר** לכל שורה, וכפתור **נתק מכל המכשירים** שמנתק את כל הסשנים בבת אחת.
- מכשיר שנותק מנותק בפועל: הוא מזוהה כמבוטל ומוצא מהמערכת אוטומטית תוך שניות.

## פרטים טכניים

- **TOTP** מבוסס מנגנון ה-MFA המובנה של Lovable Cloud (`auth.mfa.enroll/challenge/verify`), כך שהסוד נשמר מוצפן בצד השרת ולא בקוד האפליקציה. רמת האימות (AAL2) נבדקת מול השרת — לא דגל בדפדפן.
- קודי גיבוי: טבלה `mfa_backup_codes` עם hash בלבד (SHA-256 + salt), RLS פר-משתמש, אימות דרך Edge Function `mfa-backup-verify` (service role). קוד נשרף בשימוש.
- שער אכיפה: רכיב `MfaGate` בתוך `RequireAuth` — בודק `auth.mfa.getAuthenticatorAssuranceLevel()`; אם `currentLevel=aal1` ו-`nextLevel=aal2` מציג מסך challenge חוסם.
- **סשנים**: טבלה `user_devices` (user_id, device_id יציב ב-localStorage, ua, platform, browser, ip, city/country, first_seen, last_seen, revoked_at). רישום ועדכון דרך Edge Function `device-register` (מוציאה IP + גיאו מכותרות הבקשה); heartbeat כל 2 דקות. RLS: המשתמש רואה ומעדכן רק את המכשירים שלו.
- ניתוק מכשיר = סימון `revoked_at`; הלקוח בודק בכל heartbeat ומבצע `signOut()` מיידי. "נתק מכל המכשירים" מבצע בנוסף `signOut({scope:'global'})` דרך Edge Function עם service role כדי לבטל את כל ה-refresh tokens.
- קבצים חדשים: `src/components/settings/SecurityPanel.tsx`, `src/components/auth/MfaGate.tsx`, `src/hooks/use-device-session.ts`, `src/lib/security/device-fingerprint.ts`, 2 Edge Functions, מיגרציה אחת.
- תלות חדשה: `qrcode` (יצירת ה-QR מקומית, ללא שירות חיצוני).
