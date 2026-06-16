import { Component, type ReactNode } from 'react';
import { reportClientError } from '@/lib/telemetry';
import orcaLogo from '@/assets/orca-logo.png.asset.json';

interface Props { children: ReactNode; }
interface State { error: Error | null; }

function readLang(): 'he' | 'en' {
  try {
    const v = typeof window !== 'undefined' ? window.localStorage.getItem('orca:lang-cache') : null;
    return v === 'en' ? 'en' : 'he';
  } catch { return 'he'; }
}

interface Diagnosis {
  title: string;
  cause: string;
  solution: string;
  primaryAction: 'reload' | 'hard-reload';
}

function diagnose(error: Error, isRTL: boolean): Diagnosis {
  const msg = (error?.message || '').toLowerCase();
  const t = (he: string, en: string) => (isRTL ? he : en);

  // Stale/broken bundle after deploy (HTML returned for JS)
  if (msg.includes('mime') || msg.includes('text/html') || msg.includes('failed to fetch dynamically imported')) {
    return {
      title: t('המערכת עודכנה ברקע', 'A new version was deployed'),
      cause: t(
        'הדפדפן ניסה לטעון קובץ קוד ישן שכבר לא קיים בשרת — כי הועלתה גרסה חדשה של אורקה ברקע. השרת החזיר עמוד HTML במקום קוד JavaScript, ולכן הטעינה נכשלה.',
        'Your browser tried to load an old code chunk that no longer exists — a fresh build of Orca was just deployed. The server returned HTML instead of JavaScript, so the load failed.'
      ),
      solution: t(
        'לחץ "רענן עם ניקוי מטמון" — זה ימשוך את הגרסה החדשה ויפתור את התקלה לחלוטין. הנתונים שלך בענן ולא יאבדו.',
        'Click "Reload with cache clear" — this pulls the new version and resolves it completely. Your data is safe in the cloud.'
      ),
      primaryAction: 'hard-reload',
    };
  }
  if (msg.includes('chunkloaderror') || msg.includes('loading chunk') || msg.includes('loading css chunk')) {
    return {
      title: t('טעינת רכיב נכשלה', 'A module failed to load'),
      cause: t(
        'חלק מהקוד של אורקה לא ירד מהשרת — בדרך כלל בגלל חיבור אינטרנט לא יציב או גרסה חדשה שעלתה תוך כדי שהמערכת רצה.',
        'Part of the Orca code didn\'t download — usually flaky internet, or a new build that shipped while you were using the app.'
      ),
      solution: t('רענן את הדף. אם חוזר על עצמו — בדוק את החיבור לאינטרנט.', 'Reload the page. If it repeats — check your internet connection.'),
      primaryAction: 'hard-reload',
    };
  }
  if (msg.includes('networkerror') || msg.includes('failed to fetch') || msg.includes('network')) {
    return {
      title: t('בעיית רשת', 'Network problem'),
      cause: t('הדפדפן לא הצליח להגיע לשרת. ייתכן ניתוק זמני, חומת אש או VPN שחוסם.', 'The browser couldn\'t reach the server. Likely a brief disconnect, firewall, or VPN blocking the request.'),
      solution: t('בדוק את החיבור לאינטרנט ורענן. אם אתה ב-VPN — נסה לכבות אותו רגע.', 'Check your connection and reload. If on a VPN — try disabling it briefly.'),
      primaryAction: 'reload',
    };
  }
  if (msg.includes('quota') || msg.includes('storage')) {
    return {
      title: t('אחסון הדפדפן מלא', 'Browser storage is full'),
      cause: t('הדפדפן הגיע למגבלת האחסון המקומי שלו ולא יכול לשמור נתונים זמניים.', 'The browser hit its local storage limit and can\'t cache data.'),
      solution: t('נקה את הקאש של הדפדפן עבור האתר ורענן.', 'Clear site cache in your browser and reload.'),
      primaryAction: 'hard-reload',
    };
  }
  if (msg.includes('undefined') || msg.includes('null') || msg.includes('cannot read')) {
    return {
      title: t('נתון חסר ברינדור', 'A field came back empty'),
      cause: t('רכיב במסך ניסה לקרוא שדה שלא הגיע מהשרת — לרוב בעקבות עיכוב חד-פעמי בטעינת הנתונים.', 'A UI piece tried to read a field that hadn\'t arrived yet — usually a one-off data-loading hiccup.'),
      solution: t('רענן את הדף. אם חוזר — נסה לצאת ולהיכנס מחדש לחשבון.', 'Reload the page. If it persists — sign out and back in.'),
      primaryAction: 'reload',
    };
  }
  return {
    title: t('תקלה לא צפויה', 'Unexpected glitch'),
    cause: t('רכיב במערכת נתקל בשגיאה שלא צפינו מראש. הנתונים שלך בענן ולא נפגעו.', 'A component hit an unexpected error. Your data in the cloud is untouched.'),
    solution: t('רענן את הדף. אם זה חוזר על עצמו — שלח לנו צילום מסך של הפרטים הטכניים למטה.', 'Reload the page. If it repeats — send us a screenshot of the technical details below.'),
    primaryAction: 'reload',
  };
}

function hardReload() {
  try {
    // Bust caches & service worker before reloading
    if ('caches' in window) caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
    if ('serviceWorker' in navigator) navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()));
  } catch { /* noop */ }
  const url = new URL(window.location.href);
  url.searchParams.set('_r', Date.now().toString(36));
  window.location.replace(url.toString());
}

// Session-scoped flag: we allow ONE silent auto-recovery per tab lifetime.
// Prevents the "open in new tab → scary error screen" experience caused by
// transient module/race errors that disappear on the very next render.
let didAutoRecoverThisTab = false;
const BOOT_AT = typeof performance !== 'undefined' ? performance.now() : 0;

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error('[ErrorBoundary]', error, info);
    reportClientError(error);

    // First-paint protection: if the error fires within the first 2.5s of the
    // tab lifecycle and we haven't already used our recovery, silently retry.
    // Anything later, or a second failure, falls through to the full UI.
    const now = typeof performance !== 'undefined' ? performance.now() : 0;
    const earlyBoot = now - BOOT_AT < 2500;
    if (earlyBoot && !didAutoRecoverThisTab) {
      didAutoRecoverThisTab = true;
      setTimeout(() => this.setState({ error: null }), 50);
    }
  }

  reset = () => this.setState({ error: null });


  render() {
    if (!this.state.error) return this.props.children;
    const isRTL = readLang() === 'he';
    const t = (he: string, en: string) => (isRTL ? he : en);
    const dx = diagnose(this.state.error, isRTL);

    const CYAN = '#00f2ff';
    const TEAL = '#06d6a0';

    return (
      <div
        role="alert"
        dir={isRTL ? 'rtl' : 'ltr'}
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: 'radial-gradient(1200px 600px at 50% -10%, rgba(0,242,255,0.08), transparent), linear-gradient(180deg, #050b18 0%, #061326 100%)',
          color: '#e8eef8',
          fontFamily: "'Poppins', 'Inter', sans-serif",
          padding: 24,
        }}
      >
        <style>{`
          @keyframes orcaErrIn { 0% { opacity: 0; transform: translateY(14px) scale(0.98); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
          @keyframes orcaErrGlow { 0%,100% { box-shadow: 0 30px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,242,255,0.18), 0 0 40px rgba(0,242,255,0.08); } 50% { box-shadow: 0 30px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,242,255,0.32), 0 0 70px rgba(0,242,255,0.18); } }
          @keyframes orcaErrFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        `}</style>

        <div
          style={{
            width: '100%',
            maxWidth: 560,
            background: 'linear-gradient(180deg, rgba(11,23,48,0.92), rgba(6,19,38,0.92))',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            border: '1px solid rgba(0,242,255,0.18)',
            borderRadius: 22,
            padding: 32,
            textAlign: 'center',
            animation: 'orcaErrIn 0.5s cubic-bezier(0.16,1,0.3,1) both, orcaErrGlow 3.4s ease-in-out 0.6s infinite',
          }}
        >
          {/* Logo */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18, animation: 'orcaErrFloat 3.6s ease-in-out infinite' }}>
            <div style={{
              width: 78, height: 78, borderRadius: 22,
              background: `radial-gradient(circle at 30% 30%, ${CYAN}25, transparent 70%), linear-gradient(135deg, rgba(0,242,255,0.10), rgba(6,214,160,0.05))`,
              border: `1px solid ${CYAN}40`,
              display: 'grid', placeItems: 'center',
              boxShadow: `0 0 28px ${CYAN}30`,
            }}>
              <img src={orcaLogo.url} alt="Orca" style={{ width: 52, height: 52, objectFit: 'contain' }} />
            </div>
          </div>

          {/* Eyebrow */}
          <div style={{ fontSize: 10.5, letterSpacing: '0.32em', color: CYAN, fontWeight: 700, marginBottom: 10, fontFamily: "'IBM Plex Mono', monospace" }}>
            {t('הודעת מערכת מאורקה', 'A MESSAGE FROM ORCA')}
          </div>

          <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 16px 0', letterSpacing: '-0.01em' }}>
            {dx.title}
          </h1>

          {/* Cause card */}
          <div style={{
            textAlign: isRTL ? 'right' : 'left',
            background: 'rgba(0,242,255,0.04)',
            border: '1px solid rgba(0,242,255,0.14)',
            borderRadius: 12,
            padding: '14px 16px',
            marginBottom: 12,
          }}>
            <div style={{ fontSize: 10.5, letterSpacing: '0.18em', color: '#7d9bd0', marginBottom: 6, fontWeight: 700 }}>
              {t('מה קרה', 'WHAT HAPPENED')}
            </div>
            <div style={{ fontSize: 13.5, lineHeight: 1.6, color: '#dde7f7' }}>{dx.cause}</div>
          </div>

          {/* Solution card */}
          <div style={{
            textAlign: isRTL ? 'right' : 'left',
            background: `linear-gradient(135deg, ${TEAL}14, ${CYAN}08)`,
            border: `1px solid ${TEAL}40`,
            borderRadius: 12,
            padding: '14px 16px',
            marginBottom: 18,
          }}>
            <div style={{ fontSize: 10.5, letterSpacing: '0.18em', color: TEAL, marginBottom: 6, fontWeight: 700 }}>
              {t('הפתרון המומלץ', 'RECOMMENDED FIX')}
            </div>
            <div style={{ fontSize: 13.5, lineHeight: 1.6, color: '#e8f6ee' }}>{dx.solution}</div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
            <button
              onClick={dx.primaryAction === 'hard-reload' ? hardReload : () => window.location.reload()}
              style={{
                padding: '12px 22px',
                background: `linear-gradient(135deg, ${CYAN}, ${TEAL})`,
                border: 0, borderRadius: 10,
                color: '#06131F', fontFamily: 'inherit',
                fontSize: 12, fontWeight: 800, letterSpacing: '0.1em',
                cursor: 'pointer', textTransform: 'uppercase',
                boxShadow: `0 8px 24px ${CYAN}55`,
              }}
            >
              {dx.primaryAction === 'hard-reload'
                ? t('רענן עם ניקוי מטמון', 'Reload with cache clear')
                : t('רענן את הדף', 'Reload page')}
            </button>
            <button
              onClick={this.reset}
              style={{
                padding: '12px 22px',
                background: 'transparent',
                border: '1px solid rgba(0,242,255,0.35)',
                borderRadius: 10,
                color: '#e8eef8', fontFamily: 'inherit',
                fontSize: 12, fontWeight: 700, letterSpacing: '0.1em',
                cursor: 'pointer', textTransform: 'uppercase',
              }}
            >
              {t('נסה שוב', 'Try again')}
            </button>
          </div>

          {/* Reassurance */}
          <div style={{ fontSize: 11.5, color: '#7d9bd0', marginBottom: 14 }}>
            {t('הנתונים שלך שמורים בענן ולא נפגעו מהתקלה הזו.', 'Your data lives in the cloud and is unaffected by this glitch.')}
          </div>

          {/* Technical details */}
          <details style={{ textAlign: isRTL ? 'right' : 'left' }}>
            <summary style={{ fontSize: 11, color: '#6b7a93', cursor: 'pointer', letterSpacing: '0.1em' }}>
              {t('פרטים טכניים', 'Technical details')}
            </summary>
            <pre style={{
              marginTop: 8,
              fontSize: 11,
              color: '#ff8a8a',
              background: 'rgba(255,107,107,0.06)',
              border: '1px solid rgba(255,107,107,0.2)',
              padding: 10,
              borderRadius: 6,
              overflow: 'auto',
              maxHeight: 160,
              direction: 'ltr',
              textAlign: 'left',
              fontFamily: "'IBM Plex Mono', monospace",
            }}>
              {this.state.error.message}
            </pre>
          </details>
        </div>
      </div>
    );
  }
}
