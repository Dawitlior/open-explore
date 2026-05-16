import { useState, useEffect, useMemo } from 'react';
import { Download, Smartphone, Monitor, Apple, Chrome, Share, Plus, MoreVertical, Check, ArrowRight, ArrowLeft } from 'lucide-react';
import type { TradingTheme } from '@/lib/trading-theme';
import { toast } from 'sonner';

type Platform = 'iphone' | 'android' | 'windows' | 'mac';

interface Props {
  T: TradingTheme;
  t: (he: string, en: string) => string;
  isRTL: boolean;
}

interface Step {
  icon: React.ReactNode;
  title: string;
  body: string;
  badge?: string;
}

export function InstallGuide({ T, t, isRTL }: Props) {
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [step, setStep] = useState(0);
  const [canPrompt, setCanPrompt] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const check = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setCanPrompt(!!(window as any).deferredInstallPrompt);
    };
    check();
    const onPrompt = () => check();
    const onInstalled = () => { setInstalled(true); setCanPrompt(false); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    if (window.matchMedia('(display-mode: standalone)').matches) setInstalled(true);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  // Auto-detect device suggestion
  const suggested: Platform = useMemo(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) return 'iphone';
    if (/android/.test(ua)) return 'android';
    if (/mac/.test(ua)) return 'mac';
    return 'windows';
  }, []);

  const steps: Record<Platform, Step[]> = {
    iphone: [
      { icon: <Apple size={28} />, badge: t('שלב 1', 'Step 1'),
        title: t('פתח את האתר ב-Safari', 'Open this site in Safari'),
        body: t('חובה להשתמש בדפדפן Safari של אפל (זה הסמל עם המצפן הכחול). דפדפנים אחרים כמו כרום לא יאפשרו התקנה ב-iPhone.', 'You must use Apple\'s Safari browser (the blue compass icon). Other browsers like Chrome cannot install the app on iPhone.') },
      { icon: <Share size={28} />, badge: t('שלב 2', 'Step 2'),
        title: t('לחץ על כפתור השיתוף', 'Tap the Share button'),
        body: t('בתחתית המסך תראה שורה של אייקונים. לחץ על האייקון של ריבוע עם חץ שיוצא ממנו כלפי מעלה (כפתור "שיתוף").', 'At the bottom of the screen you\'ll see a row of icons. Tap the square with an arrow pointing up — the "Share" button.') },
      { icon: <Plus size={28} />, badge: t('שלב 3', 'Step 3'),
        title: t('בחר "הוסף למסך הבית"', 'Select "Add to Home Screen"'),
        body: t('יפתח תפריט. גלול מעט למטה ולחץ על "Add to Home Screen" (הוסף למסך הבית) — האייקון נראה כמו ריבוע עם סימן + במרכזו.', 'A menu will open. Scroll down a little and tap "Add to Home Screen" — the icon looks like a square with a + symbol inside it.') },
      { icon: <Check size={28} />, badge: t('שלב 4', 'Step 4'),
        title: t('לחץ "Add" בפינה הימנית', 'Tap "Add" in the top-right'),
        body: t('יוצג שם האפליקציה ("Orca"). אפשר להשאיר כמו שזה ולחוץ על "Add" בפינה הימנית למעלה. סיימת! האפליקציה נמצאת עכשיו במסך הבית שלך.', 'You\'ll see the app name ("Orca"). Leave it as is and tap "Add" in the top-right corner. Done! The app is now on your home screen.') },
    ],
    android: [
      { icon: <Chrome size={28} />, badge: t('שלב 1', 'Step 1'),
        title: t('פתח את האתר ב-Chrome', 'Open this site in Chrome'),
        body: t('פתח את האתר בדפדפן Chrome (האייקון הצבעוני). זה הדפדפן הרשמי של גוגל ומותקן כברירת מחדל ברוב מכשירי האנדרואיד.', 'Open the site in Chrome (the colorful circle icon). It\'s Google\'s official browser and is pre-installed on most Android phones.') },
      { icon: <MoreVertical size={28} />, badge: t('שלב 2', 'Step 2'),
        title: t('פתח את תפריט שלוש הנקודות', 'Open the three-dots menu'),
        body: t('בפינה הימנית למעלה תראה שלוש נקודות אנכיות (⋮). לחץ עליהן כדי לפתוח את התפריט הראשי של הדפדפן.', 'In the top-right corner you\'ll see three vertical dots (⋮). Tap them to open the browser\'s main menu.') },
      { icon: <Download size={28} />, badge: t('שלב 3', 'Step 3'),
        title: t('בחר "Install app" / "הוסף למסך הבית"', 'Select "Install app" / "Add to Home Screen"'),
        body: t('בתפריט שיפתח חפש את האפשרות "Install app" או "Add to Home Screen". יתכן שתצטרך לגלול מעט למטה כדי למצוא אותה.', 'In the menu, look for "Install app" or "Add to Home Screen". You may need to scroll down a little to find it.') },
      { icon: <Check size={28} />, badge: t('שלב 4', 'Step 4'),
        title: t('אשר על ידי לחיצה על "Install"', 'Confirm by tapping "Install"'),
        body: t('יקפוץ חלון אישור עם שם האפליקציה. לחץ על "Install" (התקן). זהו — האפליקציה תופיע עכשיו במגירת האפליקציות ובמסך הבית.', 'A confirmation popup will appear. Tap "Install". That\'s it — the app will now appear in your app drawer and on your home screen.') },
    ],
    windows: [
      { icon: <Chrome size={28} />, badge: t('שלב 1', 'Step 1'),
        title: t('פתח את האתר ב-Chrome או Edge', 'Open this site in Chrome or Edge'),
        body: t('פתח את אורקה בדפדפן Google Chrome או Microsoft Edge. שני הדפדפנים הללו תומכים בהתקנת אפליקציות ישירות מהאתר.', 'Open Orca in Google Chrome or Microsoft Edge. Both browsers support installing apps directly from a website.') },
      { icon: <Plus size={28} />, badge: t('שלב 2', 'Step 2'),
        title: t('חפש את אייקון ההתקנה בשורת הכתובת', 'Find the install icon in the address bar'),
        body: t('בקצה הימני של שורת הכתובת (איפה שכתוב orca…) חפש אייקון קטן שנראה כמו מחשב עם חץ למטה, או סימן ⊕. לחץ עליו.', 'At the right edge of the address bar (where the URL appears) look for a small icon that looks like a monitor with a down-arrow, or a ⊕ sign. Click it.') },
      { icon: <Download size={28} />, badge: t('שלב 3', 'Step 3'),
        title: t('לחץ "Install" בחלון שיקפוץ', 'Click "Install" in the popup'),
        body: t('יפתח חלון קטן עם הלוגו של אורקה ושם האפליקציה. לחץ על הכפתור הכחול "Install" (התקן).', 'A small window will open showing the Orca logo and app name. Click the blue "Install" button.') },
      { icon: <Check size={28} />, badge: t('שלב 4', 'Step 4'),
        title: t('האפליקציה נפתחת בחלון משלה', 'The app opens in its own window'),
        body: t('אורקה תיפתח עכשיו כאפליקציה עצמאית, ותופיע בתפריט Start ובשורת המשימות. אפשר לקבע אותה (Pin) לגישה מהירה.', 'Orca will now open as a standalone app, and appear in your Start menu and taskbar. You can pin it for quick access.') },
    ],
    mac: [
      { icon: <Chrome size={28} />, badge: t('שלב 1', 'Step 1'),
        title: t('פתח את האתר ב-Chrome או Edge', 'Open this site in Chrome or Edge'),
        body: t('פתח את אורקה בדפדפן Chrome או Edge. שים לב: Safari ב-Mac לא תומך בהתקנת PWA — חובה להשתמש בכרום או אדג׳.', 'Open Orca in Chrome or Edge. Note: Safari on Mac does NOT support PWA installation — you must use Chrome or Edge.') },
      { icon: <Plus size={28} />, badge: t('שלב 2', 'Step 2'),
        title: t('חפש את אייקון ההתקנה בשורת הכתובת', 'Find the install icon in the address bar'),
        body: t('בקצה הימני של שורת הכתובת חפש אייקון קטן של מחשב עם חץ למטה, או סימן ⊕. אם הוא לא מופיע, לחץ על תפריט שלוש הנקודות (⋮) ובחר "Install Orca…".', 'At the right edge of the address bar look for a small monitor-with-arrow icon, or a ⊕ sign. If you don\'t see it, click the three-dots menu (⋮) and choose "Install Orca…".') },
      { icon: <Download size={28} />, badge: t('שלב 3', 'Step 3'),
        title: t('לחץ "Install" בחלון שנפתח', 'Click "Install" in the dialog'),
        body: t('יפתח חלון אישור עם הלוגו של אורקה. לחץ על הכפתור הכחול "Install".', 'A confirmation dialog will appear with the Orca logo. Click the blue "Install" button.') },
      { icon: <Check size={28} />, badge: t('שלב 4', 'Step 4'),
        title: t('האפליקציה זמינה ב-Launchpad וב-Dock', 'The app is now in Launchpad and the Dock'),
        body: t('אורקה תופיע ב-Launchpad ותיפתח כחלון עצמאי. אפשר לגרור אותה ל-Dock לגישה מהירה בכל פעם.', 'Orca will appear in Launchpad and open as a standalone window. Drag it to the Dock for one-click access anytime.') },
    ],
  };

  const platformMeta: Record<Platform, { icon: React.ReactNode; label: string; sub: string; color: string }> = {
    iphone:  { icon: <Apple size={22} />,    label: t('iPhone / iPad', 'iPhone / iPad'),      sub: t('דרך Safari', 'via Safari'),         color: '#a1a1aa' },
    android: { icon: <Smartphone size={22} />, label: t('Android', 'Android'),                  sub: t('דרך Chrome', 'via Chrome'),         color: '#06d6a0' },
    windows: { icon: <Monitor size={22} />,   label: t('Windows', 'Windows'),                  sub: t('Chrome / Edge', 'Chrome / Edge'),   color: '#3b82f6' },
    mac:     { icon: <Monitor size={22} />,   label: t('Mac', 'Mac'),                          sub: t('Chrome / Edge', 'Chrome / Edge'),   color: '#a78bfa' },
  };

  const handleInstallNow = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dp: any = (window as any).deferredInstallPrompt;
    if (dp && dp.prompt) {
      dp.prompt();
      const choice = await dp.userChoice;
      if (choice?.outcome === 'accepted') {
        toast.success(t('האפליקציה הותקנה בהצלחה 🎉', 'App installed successfully 🎉'));
        setInstalled(true);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).deferredInstallPrompt = null;
      setCanPrompt(false);
    } else {
      toast.info(t('פעל לפי השלבים בהמשך — הכפתור הזה לא זמין כרגע בדפדפן שלך', 'Please follow the steps below — this button is not available in your browser right now'));
    }
  };

  const Arrow = isRTL ? ArrowLeft : ArrowRight;

  return (
    <>
      <style>{`
        @keyframes orca-install-fade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes orca-install-pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }
        @keyframes orca-install-ring { 0% { box-shadow: 0 0 0 0 var(--orca-ring); } 100% { box-shadow: 0 0 0 14px transparent; } }
        @keyframes orca-install-bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        .orca-install-step { animation: orca-install-fade 0.4s ease forwards; }
        .orca-install-platform-card:hover { transform: translateY(-3px); box-shadow: 0 12px 28px rgba(0,0,0,0.25); }
      `}</style>

      <div style={{
        padding: 20, borderRadius: 18,
        background: `linear-gradient(165deg, ${T.bg.secondary}, ${T.bg.primary})`,
        border: `1px solid ${T.border.subtle}`,
      }}>
        {/* Header */}
        <div style={{ textAlign: isRTL ? 'right' : 'left', marginBottom: 18 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '4px 10px', borderRadius: 999,
            background: `${T.accent.cyan}18`, color: T.accent.cyan,
            fontSize: 10, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase',
            marginBottom: 10,
          }}>
            <Download size={11} /> {t('מדריך התקנה', 'Install guide')}
          </div>
          <h3 style={{ fontSize: 22, fontWeight: 800, color: T.text.primary, margin: '0 0 6px', letterSpacing: '-0.01em' }}>
            {t('הורד את אורקה כאפליקציה — מדריך צעד-אחר-צעד', 'Install Orca as an app — step-by-step guide')}
          </h3>
          <p style={{ fontSize: 13, color: T.text.secondary, lineHeight: 1.7, margin: 0 }}>
            {t('אנחנו ננחה אותך בדיוק איפה ללחוץ. אל דאגה, זה לוקח פחות מדקה ולא דורש שום ידע טכני. בחר/י קודם את סוג המכשיר שלך:', 'We\'ll show you exactly where to tap. Don\'t worry — it takes less than a minute and requires zero technical knowledge. First, pick your device:')}
          </p>
        </div>

        {installed && (
          <div style={{
            padding: 14, borderRadius: 12, marginBottom: 14,
            background: `${T.accent.green}15`, border: `1px solid ${T.accent.green}40`,
            color: T.accent.green, fontWeight: 700, fontSize: 13,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <Check size={18} /> {t('אורקה כבר מותקנת על המכשיר הזה ✓', 'Orca is already installed on this device ✓')}
          </div>
        )}

        {/* Platform picker */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10,
          marginBottom: 18,
        }}>
          {(Object.keys(platformMeta) as Platform[]).map((p) => {
            const meta = platformMeta[p];
            const active = platform === p;
            const isSuggested = suggested === p;
            return (
              <button
                key={p}
                className="orca-install-platform-card"
                onClick={() => { setPlatform(p); setStep(0); }}
                style={{
                  position: 'relative',
                  padding: '14px 10px', borderRadius: 14, cursor: 'pointer',
                  background: active ? `linear-gradient(135deg, ${meta.color}25, ${meta.color}10)` : T.bg.tertiary,
                  border: `1.5px solid ${active ? meta.color : T.border.subtle}`,
                  color: active ? meta.color : T.text.secondary,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  fontWeight: 700, fontSize: 13,
                  transition: 'all 0.25s',
                  fontFamily: 'inherit',
                }}
              >
                {isSuggested && !active && (
                  <span style={{
                    position: 'absolute', top: -7, [isRTL ? 'left' : 'right']: 8,
                    fontSize: 8, fontWeight: 800, letterSpacing: '0.12em',
                    background: T.accent.cyan, color: T.bg.primary,
                    padding: '2px 6px', borderRadius: 6,
                  }}>{t('המכשיר שלך', 'Your device')}</span>
                )}
                {meta.icon}
                <div>{meta.label}</div>
                <div style={{ fontSize: 10, opacity: 0.7, fontWeight: 500 }}>{meta.sub}</div>
              </button>
            );
          })}
        </div>

        {/* Steps */}
        {platform && (() => {
          const all = steps[platform];
          const cur = all[step];
          const meta = platformMeta[platform];
          const isLast = step === all.length - 1;
          return (
            <div key={platform + step} className="orca-install-step" style={{
              padding: 20, borderRadius: 16,
              background: T.bg.tertiary,
              border: `1px solid ${T.border.subtle}`,
            }}>
              {/* Progress dots */}
              <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 18 }}>
                {all.map((_, i) => (
                  <div key={i} style={{
                    width: i === step ? 24 : 8, height: 8, borderRadius: 999,
                    background: i <= step ? meta.color : `${T.text.muted}40`,
                    transition: 'all 0.3s',
                  }} />
                ))}
              </div>

              <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', marginBottom: 18 }}>
                <div
                  style={{
                    flexShrink: 0,
                    width: 64, height: 64, borderRadius: 18,
                    display: 'grid', placeItems: 'center',
                    background: `linear-gradient(135deg, ${meta.color}30, ${meta.color}10)`,
                    border: `1.5px solid ${meta.color}50`,
                    color: meta.color,
                    animation: 'orca-install-bounce 2s ease-in-out infinite',
                    ['--orca-ring' as string]: `${meta.color}60`,
                  } as React.CSSProperties}
                >
                  {cur.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0, textAlign: isRTL ? 'right' : 'left' }}>
                  <div style={{
                    display: 'inline-block', fontSize: 9, fontWeight: 800,
                    letterSpacing: '0.2em', textTransform: 'uppercase',
                    color: meta.color, marginBottom: 6,
                  }}>{cur.badge}</div>
                  <h4 style={{ fontSize: 17, fontWeight: 800, color: T.text.primary, margin: '0 0 8px', lineHeight: 1.35 }}>
                    {cur.title}
                  </h4>
                  <p style={{ fontSize: 13, color: T.text.secondary, lineHeight: 1.7, margin: 0 }}>
                    {cur.body}
                  </p>
                </div>
              </div>

              {/* Step nav */}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  onClick={() => setStep(s => Math.max(0, s - 1))}
                  disabled={step === 0}
                  style={{
                    padding: '10px 14px', borderRadius: 12,
                    background: 'transparent', border: `1px solid ${T.border.subtle}`,
                    color: step === 0 ? T.text.muted : T.text.secondary,
                    cursor: step === 0 ? 'not-allowed' : 'pointer',
                    fontWeight: 700, fontSize: 12, fontFamily: 'inherit',
                    opacity: step === 0 ? 0.4 : 1,
                  }}
                >
                  {isRTL ? '→' : '←'} {t('הקודם', 'Back')}
                </button>

                {isLast ? (
                  <button
                    onClick={() => { setPlatform(null); setStep(0); toast.success(t('כל הכבוד! בחר מכשיר אחר אם תרצה', 'Nice! Pick another device anytime')); }}
                    style={{
                      padding: '10px 18px', borderRadius: 12,
                      background: `linear-gradient(135deg, ${meta.color}, ${T.accent.cyan})`,
                      border: 'none', color: T.bg.primary,
                      fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                      boxShadow: `0 8px 22px ${meta.color}50`,
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}
                  >
                    <Check size={14} /> {t('סיימתי', 'I\'m done')}
                  </button>
                ) : (
                  <button
                    onClick={() => setStep(s => Math.min(all.length - 1, s + 1))}
                    style={{
                      padding: '10px 18px', borderRadius: 12,
                      background: `linear-gradient(135deg, ${meta.color}, ${T.accent.cyan})`,
                      border: 'none', color: T.bg.primary,
                      fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                      boxShadow: `0 8px 22px ${meta.color}40`,
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}
                  >
                    {t('הבא', 'Next')} <Arrow size={14} />
                  </button>
                )}
              </div>
            </div>
          );
        })()}

        {!platform && (
          <div style={{
            padding: 18, borderRadius: 14, textAlign: 'center',
            background: T.bg.tertiary, border: `1px dashed ${T.border.subtle}`,
            color: T.text.muted, fontSize: 12,
          }}>
            {t('👆 בחר/י סוג מכשיר כדי להתחיל את המדריך', '👆 Pick a device above to begin the guide')}
          </div>
        )}

        {/* Shortcut install button */}
        {canPrompt && !installed && (
          <div style={{ marginTop: 16, padding: 14, borderRadius: 14,
            background: `linear-gradient(135deg, ${T.accent.cyan}15, ${T.accent.green}10)`,
            border: `1px solid ${T.accent.cyan}40`,
          }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ fontSize: 22 }}>⚡</div>
              <div style={{ flex: 1, minWidth: 180, textAlign: isRTL ? 'right' : 'left' }}>
                <div style={{ fontWeight: 800, color: T.text.primary, fontSize: 13, marginBottom: 2 }}>
                  {t('התקנה בלחיצה אחת', 'One-click install available')}
                </div>
                <div style={{ fontSize: 11, color: T.text.muted }}>
                  {t('הדפדפן שלך תומך בהתקנה אוטומטית — לא צריך לעבור על השלבים', 'Your browser supports automatic install — no manual steps needed')}
                </div>
              </div>
              <button
                onClick={handleInstallNow}
                style={{
                  padding: '10px 18px', borderRadius: 12,
                  background: `linear-gradient(135deg, ${T.accent.cyan}, ${T.accent.green})`,
                  border: 'none', color: T.bg.primary, fontWeight: 800, fontSize: 13, cursor: 'pointer',
                  boxShadow: `0 8px 22px ${T.accent.cyan}40`, fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                <Download size={14} /> {t('התקן עכשיו', 'Install now')}
              </button>
            </div>
          </div>
        )}

        {/* "Didn't work?" rescue block — always available */}
        {!installed && (
          <div style={{
            marginTop: 16, padding: 18, borderRadius: 14,
            background: `linear-gradient(135deg, ${T.accent.amber || '#f59e0b'}10, ${T.accent.cyan}08)`,
            border: `1px solid ${(T.accent.amber || '#f59e0b')}35`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 10,
                background: `${T.accent.amber || '#f59e0b'}25`,
                display: 'grid', placeItems: 'center', fontSize: 18,
              }}>🤔</div>
              <div style={{ flex: 1, textAlign: isRTL ? 'right' : 'left' }}>
                <div style={{ fontWeight: 800, color: T.text.primary, fontSize: 14 }}>
                  {t('לא הצלחתם?', "Didn't work?")}
                </div>
                <div style={{ fontSize: 11, color: T.text.muted }}>
                  {t('אל דאגה — יש לנו עוד שתי דרכים מהירות להתקין את אורקה', "No worries — we have two more quick ways to install Orca")}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              <button
                onClick={handleInstallNow}
                style={{
                  width: '100%', padding: '14px 18px', borderRadius: 12,
                  background: `linear-gradient(135deg, ${T.accent.cyan}, ${T.accent.green})`,
                  border: 'none', color: T.bg.primary, fontWeight: 800, fontSize: 14, cursor: 'pointer',
                  boxShadow: `0 10px 26px ${T.accent.cyan}45`, fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                }}
              >
                <Download size={16} /> {t('נסו להוריד את זה מפה', "Try installing from here")}
              </button>

              <button
                onClick={async () => {
                  const url = location.origin;
                  try {
                    if (navigator.share) {
                      await navigator.share({ title: 'Orca Investment', url });
                      return;
                    }
                  } catch { /* user cancelled */ }
                  try {
                    await navigator.clipboard.writeText(url);
                    toast.success(t('הקישור הועתק! פתח/י אותו בכרום או ספארי כדי להתקין', 'Link copied! Open it in Chrome or Safari to install'));
                  } catch {
                    toast.info(t(`העתק/י ידנית: ${url}`, `Copy manually: ${url}`));
                  }
                }}
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: 12,
                  background: 'transparent', border: `1.5px solid ${T.border.subtle}`,
                  color: T.text.primary, fontWeight: 700, fontSize: 12, cursor: 'pointer',
                  fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                📤 {t('שלח/י לטלפון או העתק קישור', 'Send to phone or copy link')}
              </button>

              <div style={{
                fontSize: 11, color: T.text.muted, lineHeight: 1.6,
                padding: '10px 12px', borderRadius: 10,
                background: T.bg.tertiary, border: `1px dashed ${T.border.subtle}`,
                textAlign: isRTL ? 'right' : 'left',
              }}>
                💡 {t(
                  'גם אם ההתקנה לא מצליחה — אורקה עובדת בדפדפן ב-100%. אפשר פשוט לסמן את האתר ב"מועדפים" / "Bookmark" (Ctrl+D או ⌘+D) ולגשת אליה מתי שרוצים.',
                  'Even if installation fails, Orca works 100% in the browser. Just bookmark this site (Ctrl+D or ⌘+D) and open it anytime.'
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default InstallGuide;
