# 🛡️ Orca — Master Plan: אבטחה, נגישות, פרטיות ו-Cookie Consent

מטרה: לסגור את כל הממצאים הקריטיים מהדוח, להוסיף שכבת Cookie Consent מקצועית, ולשפר נגישות (WCAG AA) — **בלי לשבור פיצ׳ר קיים ובלי לפגוע בביצועים**.

הביצוע מחולק ל-5 גלים. כל גל קטן, עצמאי, וניתן לבדיקה לפני המעבר הבא.

---

## 🌊 Wave 1 — P0 Security (חובה, מיידי)

תיקונים שאינם נראים למשתמש אך סוגרים פרצות אמיתיות.

1. **Avatars bucket** — להסיר את ה-policy הציבורי על `storage.objects`. הקריאה תמשיך לעבוד דרך Signed URLs שכבר בנויים ב-`src/lib/avatar.ts`. אפס שינוי UI.
2. **`oracle_nodes.claim_token`** — להחליף את ה-policy `USING true` ב-policy שמחזיר token רק לבעלים (`auth.uid() = user_id`). מי שאין לו user_id (seed nodes גלובליים) — לחשוף רק את ה-metadata, לא את ה-token.
3. **`billing_events`** — להוסיף `NOT NULL` ל-`user_id` + policy שמונע יתומים, ו-INSERT policy שמחייב `auth.uid() = user_id`.
4. **Realtime hardening** — להוסיף RLS ל-`realtime.messages` עבור `economic_events` כך שרק authenticated יוכלו להאזין.
5. **HIBP (Have I Been Pwned)** — להפעיל בדיקת סיסמאות שדלפו דרך `configure_auth`.
6. **Security scan** — להריץ סריקה אחרי כל מיגרציה ולוודא אפס P0.

**בדיקה**: התחברות, העלאת אווטאר, סשן Oracle, אירועי כלכלה — כולם חייבים לעבוד כרגיל.

---

## 🌊 Wave 2 — Cookie Consent + Privacy Layer

בניית מערכת הסכמה לעוגיות ברמה מקצועית (GDPR/CCPA-friendly), בלי להאט את האפליקציה.

**Frontend:**
- `src/components/privacy/CookieConsentBanner.tsx` — באנר תחתון, RTL/LTR, theme-aware (תואם Midnight/Platinum), נטען Lazy אחרי first paint כדי לא לפגוע ב-LCP.
- `src/components/privacy/CookiePreferencesModal.tsx` — בחירה גרנולרית: Essential (תמיד פעיל), Analytics, Functional, Marketing.
- `src/hooks/use-cookie-consent.ts` — hook גלובלי, persists ב-`user_settings` (cloud) + cache מקומי לטעינה מיידית.
- כפתור "ניהול עוגיות" קבוע ב-`SettingsHub` ובפוטר של `Landing`.

**Backend:**
- שדה `consent` ב-`user_preferences` (jsonb) — `{essential, analytics, functional, marketing, version, accepted_at}`.
- טבלה חדשה `consent_log` (user_id, version, choices, ip_hash, user_agent, created_at) — מסלול ביקורת לרגולציה.
- כל "טעינה מותנית" (analytics, sentry, וכו') תתבצע רק אם הצרכן אישר.

**Performance**: הבאנר נטען עם `lazy()` + `requestIdleCallback`, אפס JS חוסם.

---

## 🌊 Wave 3 — Accessibility (WCAG 2.1 AA)

עבודה ממוקדת בלי לשנות עיצוב.

1. **HTML lang/dir דינמי** — `index.html` נטען עם `lang="he"`, ו-`useLang` כבר מעדכן בזמן ריצה. נסיר את `maximum-scale=1.0` מה-viewport (חוסם זום — כשל WCAG 1.4.4).
2. **Landmarks** — לעטוף את ה-content הראשי בכל עמוד עם `<main id="main">`, להוסיף "Skip to content" link.
3. **aria-label sweep** — סקריפט שמזהה כפתורי icon-only ללא label (`SettingsHub`, `MobileBottomNav`, `TradeForm`, `NavAvatar` וכו'), ומוסיף labels דו-לשוניים.
4. **Alt text** — לכל `<img>` להוסיף `alt` משמעותי (או `alt=""` לדקורטיביים).
5. **Focus visible** — תוספת CSS גלובלית ב-`index.css`: `:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }`.
6. **`prefers-reduced-motion`** — wrapper ב-`OrcaUXLayer` שמכבה אנימציות כבדות אם המשתמש ביקש.
7. **Contrast audit** — מעבר על Platinum theme (שכבר תוקן בסקירה השבועית) ולוודא טוקנים תקינים.

**ללא רגרסיה ויזואלית**: אפס שינוי לפלטה, לטיפוגרפיה, או לפריסה.

---

## 🌊 Wave 4 — Observability & Hardening (P1)

שכבת תצפית בסיסית בלי תלות חיצונית.

1. **Error boundary טלמטריה** — `ErrorBoundary` כבר קיים; נוסיף שליחה לטבלת `client_errors` (user_id, route, message, stack_hash, ua, created_at) עם דה-דופליקציה לפי hash.
2. **CSP headers** — להוסיף `<meta http-equiv="Content-Security-Policy">` ל-`index.html` עם whitelist (Supabase, Google Fonts, Lovable). מצב report-only קודם, להפעיל אכיפה אחרי 48 שעות בדיקה.
3. **Rate limiting בסיסי** — בכל edge function: counter ב-memory לפי IP (10 req/min). לא מצריך תשתית חדשה.
4. **Dependabot/Snyk קונפיג** — קובץ `.github/dependabot.yml` (גם אם לא מופעל כעת — מוכן לרגע ההפעלה).

---

## 🌊 Wave 5 — Responsive & Mobile Polish

1. **Tablet breakpoints** — מעבר על Dashboard / Weekly Review / Analytics ב-768-1024px ובדיקה ש-`DesktopOnlyGate` לא חוסם מסכים חוקיים.
2. **`h-dvh` במקום `h-screen`** במסכים מובייליים שעדיין משתמשים ב-`100vh`.
3. **Touch targets** — לוודא 44×44 לכפתורי ניווט תחתון ופעולות קריטיות.

---

## ✅ פרוטוקול בדיקה אחרי כל גל

לפני המעבר לגל הבא:
- [ ] Login + Logout עובדים
- [ ] יומן מסחר נטען (Trade Journal)
- [ ] סקירה שבועית נפתחת ושומרת
- [ ] Oracle session רץ ללא שגיאות
- [ ] Console נקי משגיאות חדשות
- [ ] `security_scan` — אפס P0
- [ ] Lighthouse Performance ≥ 85, Accessibility ≥ 95

---

## 📊 השפעת ביצועים — מה עושים כדי שלא תהיה האטה

| איום | פתרון |
|---|---|
| Cookie banner חוסם render | `lazy()` + `requestIdleCallback`, אפס CSS-in-JS |
| RLS חדשות מאיטות שאילתות | אינדקסים על `user_id` (כבר קיימים), policies פשוטות בלבד |
| CSP שובר משאבים | תחילה במצב `report-only` עם logging |
| Telemetry של errors | דה-דופליקציה לפי hash + throttle של 1/10 שניות |
| a11y CSS תוספת | בלבד `:focus-visible` ו-`prefers-reduced-motion` — מילישניות |

---

## 🗓️ סדר עבודה מוצע (אם תאשר)

1. **היום**: Wave 1 (P0 security) + סריקת אבטחה.
2. **מחר**: Wave 2 (Cookie Consent) — UI + טבלת `consent_log`.
3. **לאחר מכן**: Wave 3 (a11y), 4 (observability), 5 (responsive) — כל אחד בנפרד.

לכל גל אעצור, אריץ בדיקות, ואדווח לפני המעבר לגל הבא — כדי שתוכל לאשר בכל שלב.

**אשר את התוכנית ואני מתחיל מ-Wave 1 מיד.**
