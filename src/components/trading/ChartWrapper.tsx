import { ReactNode, Component, ErrorInfo } from 'react';
import type { TradingTheme } from '@/lib/trading-theme';
import { GlassCard } from './TradingUI';

class ChartErrorBoundary extends Component<{ children: ReactNode; T: TradingTheme }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Chart render failed:', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, textAlign: 'center', fontSize: 11, color: this.props.T.text.muted, fontFamily: "'JetBrains Mono', monospace" }}>
          ⚠ Chart unavailable
        </div>
      );
    }
    return this.props.children;
  }
}

export interface ChartExplanation {
  what: string;
  why: string;
  interpret: string;
  good: string;
  action: string;
}

interface ChartWrapperProps {
  T: TradingTheme;
  title: string;
  explanation: ChartExplanation;
  children: ReactNode;
  style?: React.CSSProperties;
  unit?: string;
  chartId?: string;
  onRemove?: (chartId: string) => void;
  onExplainClick?: (title: string, explanation: ChartExplanation, chartId?: string) => void;
}

export const ChartWrapper = ({ T, title, explanation, children, style, unit, chartId, onRemove, onExplainClick }: ChartWrapperProps) => {
  const handleInfoClick = () => {
    if (onExplainClick) {
      onExplainClick(title, explanation, chartId);
    }
  };

  return (
    <GlassCard T={T} className="orca-chart-card" style={{ position: 'relative', minWidth: 0, maxWidth: '100%', ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 8, minWidth: 0 }}>
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', minWidth: 0 }}
          onClick={handleInfoClick}
        >
          <div className="orca-chart-title" style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.08em', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
          {unit && <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 4, background: `${T.accent.purple}15`, color: T.accent.purple, fontWeight: 600, flexShrink: 0 }}>{unit}</span>}
        </div>
        <button
          onClick={handleInfoClick}
          style={{
            width: 18, height: 18, minWidth: 18, minHeight: 18, borderRadius: '50%', border: `1px solid ${T.border.medium}`,
            background: 'transparent', color: T.text.muted,
            cursor: 'pointer', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s', flexShrink: 0,
          }}
        >
          i
        </button>
      </div>
      <ChartErrorBoundary T={T}>{children}</ChartErrorBoundary>
    </GlassCard>
  );
};

// Bilingual chart explanations.
// Stored as { he, en } per field; the exported `EXPLANATIONS` is a Proxy that
// returns the localized ChartExplanation based on the current <html lang> at
// access time. Consumers can keep using `EXPLANATIONS.foo` unchanged — the
// content re-evaluates every render, so switching language refreshes it.
type LocalizedExplanation = {
  what: { he: string; en: string };
  why: { he: string; en: string };
  interpret: { he: string; en: string };
  good: { he: string; en: string };
  action: { he: string; en: string };
};

const EXPLANATIONS_DATA: Record<string, LocalizedExplanation> = {
  netPnl: {
    what: { he: 'סה"כ הרווח או ההפסד הנקי מכל העסקאות — השורה התחתונה.', en: 'Total net profit or loss across all trades — the bottom line.' },
    why: { he: 'זהו המדד הבסיסי ביותר: האם אתה מרוויח כסף או מפסיד. הכל מתחיל כאן.', en: 'The most fundamental metric: are you making money or losing it. Everything starts here.' },
    interpret: { he: 'מספר חיובי = רווח. שלילי = הפסד. עקוב אחרי המגמה, לא רק המספר הנוכחי.', en: 'Positive = profit. Negative = loss. Follow the trend, not just the current number.' },
    good: { he: 'טוב: חיובי ועולה בהתמדה. רע: שלילי או יורד.', en: 'Good: positive and steadily rising. Bad: negative or declining.' },
    action: { he: 'אם שלילי, בדוק את התוחלת ואת ניהול הסיכונים לפני שממשיך לסחור.', en: 'If negative, review your expectancy and risk management before placing more trades.' },
  },
  winRate: {
    what: { he: 'אחוז העסקאות שהסתיימו ברווח מתוך כלל העסקאות.', en: 'The percentage of trades that closed at a profit.' },
    why: { he: 'מדד בסיסי ליעילות. אבל אחוז הצלחה גבוה לבד לא אומר רווחיות — צריך גם יחס R:R טוב.', en: 'A basic efficiency metric. But a high win rate alone is not profitability — you also need a healthy R:R.' },
    interpret: { he: 'מעל 50% עם R:R סביר = מצב טוב. מתחת ל-40% דורש רווחים גדולים יותר לכל עסקה.', en: 'Above 50% with a decent R:R = healthy. Below 40% requires larger winners per trade.' },
    good: { he: 'טוב: 45-65% עם R:R מעל 1.5. רע: מתחת ל-35% עם R:R נמוך.', en: 'Good: 45–65% with R:R above 1.5. Bad: below 35% with low R:R.' },
    action: { he: 'אם נמוך, בדוק את קריטריוני הכניסה והדיוק בתזמון.', en: 'If low, review your entry criteria and timing precision.' },
  },
  maxDrawdownMetric: {
    what: { he: 'הירידה המקסימלית באחוזים מנקודת השיא של ההון — העומק הגרוע ביותר.', en: 'The maximum percentage drop from the equity peak — the worst depth you have seen.' },
    why: { he: 'מודד את הכאב המקסימלי שחווית. קריטי לפסיכולוגיה ולהישרדות.', en: 'Measures the worst pain you have experienced. Critical for psychology and survival.' },
    interpret: { he: 'ירידה של 10% דורשת 11.1% רווח להתאוששות. ירידה של 50% דורשת 100%.', en: 'A 10% drawdown needs an 11.1% gain to recover. A 50% drawdown needs 100%.' },
    good: { he: 'טוב: מתחת ל-8%. אזהרה: 8-15%. קריטי: מעל 15%.', en: 'Good: under 8%. Warning: 8–15%. Critical: above 15%.' },
    action: { he: 'אם הנסיגה חורגת מ-10%, הקטן מיידית את גודל הפוזיציה ב-50%.', en: 'If the drawdown exceeds 10%, immediately cut position size by 50%.' },
  },
  orcaScore: {
    what: { he: 'ציון משולב (0-100) המשקלל משמעת, ניהול סיכון, איכות החלטות ועקביות.', en: 'A composite score (0–100) weighting discipline, risk management, decision quality, and consistency.' },
    why: { he: 'מדד-על שמאגד את כל ממדי הביצועים למספר אחד פשוט.', en: 'A meta-metric that aggregates every performance dimension into one simple number.' },
    interpret: { he: 'גבוה = מערכת מסחר בריאה ועקבית. נמוך = יש בעיות שצריך לטפל בהן.', en: 'High = a healthy, consistent trading system. Low = there are issues to address.' },
    good: { he: 'טוב: מעל 70. מצוין: מעל 85. רע: מתחת ל-50.', en: 'Good: above 70. Excellent: above 85. Bad: below 50.' },
    action: { he: 'בדוק את פירוט הרדאר כדי לראות איזה ממד מוריד את הציון, ותקן אותו.', en: 'Open the radar breakdown to see which dimension drags the score down, then fix it.' },
  },
  edgeHealth: {
    what: { he: 'מודד את בריאות היתרון שלך לאורך זמן — האם היתרון נשמר או נשחק.', en: 'Tracks the health of your edge over time — whether it is holding up or eroding.' },
    why: { he: 'יתרונות נשחקים. זיהוי מוקדם של שחיקה מציל הון.', en: 'Edges decay. Catching erosion early saves capital.' },
    interpret: { he: 'ירידה מתמדת מסמנת שהאסטרטגיה מאבדת יעילות בתנאי השוק הנוכחיים.', en: 'A persistent decline signals the strategy is losing efficiency in current market conditions.' },
    good: { he: 'טוב: מעל 65, יציב או עולה. רע: מתחת ל-40 או יורד.', en: 'Good: above 65, stable or rising. Bad: below 40 or trending down.' },
    action: { he: 'אם יורד, הקטן גודל והתאם את האסטרטגיה לתנאי השוק הנוכחיים.', en: 'If declining, cut size and adapt the strategy to current market conditions.' },
  },
  regimeFit: {
    what: { he: 'מודד עד כמה האסטרטגיה שלך מתאימה לתנאי השוק הנוכחיים (טרנד/צד/תנודתי).', en: 'How well your strategy fits the current market regime (trending / ranging / volatile).' },
    why: { he: 'אסטרטגיה מצוינת בשוק לא מתאים תפסיד. התאמה חשובה יותר מאיכות מוחלטת.', en: 'A great strategy in the wrong market loses. Fit matters more than absolute quality.' },
    interpret: { he: 'ציון גבוה = האסטרטגיה עובדת בסביבה הנוכחית. נמוך = חוסר התאמה.', en: 'High score = the strategy fits the current environment. Low = poor fit.' },
    good: { he: 'טוב: מעל 60. רע: מתחת ל-40 — שקול להפסיק עד שהתנאים משתנים.', en: 'Good: above 60. Bad: below 40 — consider pausing until conditions change.' },
    action: { he: 'אם נמוך, בדוק אם השוק השתנה ואם האסטרטגיה עדיין רלוונטית.', en: 'If low, check whether the market regime shifted and whether the strategy still applies.' },
  },
  riskConsistencyMetric: {
    what: { he: 'מודד עד כמה אתה עקבי באחוז הסיכון לעסקה — האם אתה מסכן אותו הדבר בכל פעם.', en: 'How consistent your per-trade risk is — are you risking the same amount each time.' },
    why: { he: 'עקביות בסיכון היא הבסיס לצמיחה יציבה. שינויים אקראיים בגודל הורסים עקומות הון.', en: 'Risk consistency is the foundation of stable growth. Random size changes wreck equity curves.' },
    interpret: { he: 'ציון גבוה = סיכון עקבי. נמוך = סיכון משתנה בין עסקאות.', en: 'High score = consistent risk. Low = risk varies between trades.' },
    good: { he: 'טוב: מעל 75. רע: מתחת ל-50 — סימן להחלטות רגשיות על גודל.', en: 'Good: above 75. Bad: below 50 — a sign of emotional sizing decisions.' },
    action: { he: 'הגדר אחוז סיכון קבוע (1-2%) והקפד עליו בכל עסקה, ללא יוצא מן הכלל.', en: 'Set a fixed risk percentage (1–2%) and enforce it on every trade, no exceptions.' },
  },
  disciplineMetric: {
    what: { he: 'אחוז העסקאות שבוצעו לפי הכללים שהגדרת — כולל גודל, כניסה, סטופ ויעד.', en: 'The percentage of trades executed by your rules — sizing, entry, stop, and target.' },
    why: { he: 'משמעת היא ההבדל בין סוחר רווחי לסוחר מהמר. עקביות בכללים = עקביות ברווח.', en: 'Discipline separates profitable traders from gamblers. Rule consistency = profit consistency.' },
    interpret: { he: 'מעל 80% = משמעת מצוינת. מתחת ל-60% = הכללים לא נאכפים.', en: 'Above 80% = excellent discipline. Below 60% = rules are not being enforced.' },
    good: { he: 'טוב: מעל 80%. רע: מתחת ל-60% — הכללים שלך לא שווים כלום אם אתה לא עוקב.', en: 'Good: above 80%. Bad: below 60% — your rules are worthless if you do not follow them.' },
    action: { he: 'אם נמוך, צמצם את מספר הכללים ל-3 הכי חשובים והתמקד בהם בלבד.', en: 'If low, trim your ruleset to the 3 most important and focus only on those.' },
  },
  equityCurve: {
    what: { he: 'עוקב אחרי יתרת החשבון לאחר כל עסקה, ומציג את מסלול הצמיחה.', en: 'Tracks account equity after every trade, showing your growth trajectory.' },
    why: { he: 'חושף האם ליתרון שלך יש צמיחה עקבית או תנודות חריגות.', en: 'Reveals whether your edge produces consistent growth or erratic swings.' },
    interpret: { he: 'עקומה עולה בהתמדה מעידה על יתרון חזק. תקופות שטוחות מסמנות חוסר התאמה.', en: 'A steadily rising curve signals a strong edge. Flat periods signal a fit problem.' },
    good: { he: 'טוב: שיפוע עולה חלק. רע: ירידות חדות, תקופות שטוחות ארוכות, או הפסדים מואצים.', en: 'Good: a smooth upward slope. Bad: sharp drops, long flat periods, or accelerating losses.' },
    action: { he: 'אם העקומה משתטחת, הקטן גודל פוזיציה ובדוק את הסטאפים. אם יורדת, עצור ונתח.', en: 'If the curve flattens, cut size and review setups. If it falls, stop and analyze.' },
  },
  pnlDistribution: {
    what: { he: 'מציג את הרווח/הפסד בדולרים של כל עסקה כעמודה.', en: 'Shows each trade\'s dollar P&L as a single bar.' },
    why: { he: 'עוזר לזהות עסקאות חריגות ואת צורת ההתפלגות הכללית.', en: 'Helps you spot outliers and see the overall shape of the distribution.' },
    interpret: { he: 'באופן אידיאלי, הרווחים צריכים להיות גדולים מההפסדים. חפש עקביות בגודל ההפסדים.', en: 'Ideally, winners should be larger than losers. Look for consistency in loss size.' },
    good: { he: 'טוב: הפסדים קטנים ועקביים, רווחים גדולים יותר. רע: הפסדים גדולים ואקראיים, רווחים זעירים.', en: 'Good: small, consistent losses and larger winners. Bad: large random losses and tiny winners.' },
    action: { he: 'אם ההפסדים לא עקביים, הדק את ביצוע הסטופ לוס.', en: 'If losses are inconsistent, tighten your stop-loss execution.' },
  },
  rDistribution: {
    what: { he: 'מציג את התשואה של כל עסקה ביחידות R (יחידות סיכון).', en: 'Shows each trade\'s return in R-multiples (risk units).' },
    why: { he: 'R-multiples מנרמלים ביצועים ללא תלות בסכום הסיכון — המדד האמיתי לאיכות היתרון.', en: 'R-multiples normalize performance regardless of risk size — the true measure of edge quality.' },
    interpret: { he: 'כל עמודה מראה כמה יחידות סיכון הרווחת או הפסדת. רווח 2R אומר שהרווחת פי 2 מהסיכון.', en: 'Each bar shows the risk units you gained or lost. A 2R win means you made 2× your risk.' },
    good: { he: 'טוב: רוב הרווחים מעל 1.5R, הפסדים קרובים ל-1R-. רע: רווחים מתחת ל-1R, הפסדים מעבר ל-1.5R-.', en: 'Good: most wins above 1.5R, losses near -1R. Bad: wins under 1R, losses beyond -1.5R.' },
    action: { he: 'התמקד בסטאפים שמספקים 2R+ באופן עקבי. הסר סטאפים עם ממוצע R נמוך מ-1.', en: 'Focus on setups that consistently deliver 2R+. Drop setups with an average R below 1.' },
  },
  expectancy: {
    what: { he: 'תשואה צפויה לעסקה ביחידות R: (אחוז הצלחה × ממוצע רווח R) − (אחוז הפסד × ממוצע הפסד R).', en: 'Expected return per trade in R: (win rate × avg win R) − (loss rate × avg loss R).' },
    why: { he: 'תוחלת ב-R היא המדד היחיד האמיתי לאיכות היתרון. תוחלת דולרית מעוותת ע"י גודל פוזיציה.', en: 'R-expectancy is the only true measure of edge quality. Dollar expectancy is distorted by position size.' },
    interpret: { he: 'תוחלת חיובית אומרת שהמערכת שלך מרוויחה לאורך זמן. ככל שגבוה יותר = יתרון חזק יותר.', en: 'Positive expectancy means your system profits over time. Higher = stronger edge.' },
    good: { he: 'טוב: מעל 0.3R. מצוין: מעל 0.5R. רע: שלילי או קרוב לאפס.', en: 'Good: above 0.3R. Excellent: above 0.5R. Bad: negative or near zero.' },
    action: { he: 'אם התוחלת יורדת, בדוק את איכות העסקאות האחרונות ואת ההתאמה לתנאי השוק.', en: 'If expectancy is falling, review recent trade quality and current market fit.' },
  },
  drawdown: {
    what: { he: 'מציג את הירידה באחוזים מנקודת השיא של ההון בכל נקודת זמן.', en: 'Shows the percentage drop from the equity peak at every point in time.' },
    why: { he: 'חושף את הכאב שהמערכת שלך גורמת — קריטי לניהול סיכונים ולפסיכולוגיה.', en: 'Reveals the pain your system inflicts — critical for risk management and psychology.' },
    interpret: { he: 'ירידות עמוקות דורשות מאמץ אקספוננציאלי להתאוששות. ירידה של 10% דורשת 11.1% רווח.', en: 'Deep drawdowns require exponential effort to recover. A 10% drop needs 11.1% to come back.' },
    good: { he: 'טוב: ירידות רדודות וקצרות (מתחת ל-5%). רע: ירידות עמוקות (מעל 10%) וממושכות.', en: 'Good: shallow, short drawdowns (under 5%). Bad: deep (over 10%) and prolonged.' },
    action: { he: 'אם הירידה חורגת מהסף שלך, הקטן גודל פוזיציה ב-50% והתמקד בסטאפים איכותיים בלבד.', en: 'If the drawdown breaches your threshold, halve position size and trade only top-quality setups.' },
  },
  riskAllocation: {
    what: { he: 'מציג כיצד הון הסיכון הכולל מתחלק בין נכסים שונים.', en: 'Shows how your total risk capital is split across assets.' },
    why: { he: 'ריכוז סיכון יכול להרוס חשבונות. פיזור מחליק את עקומת ההון.', en: 'Concentrated risk can blow up accounts. Diversification smooths the equity curve.' },
    interpret: { he: 'באופן אידיאלי, אף נכס לא צריך לייצג יותר מ-30% מהסיכון הכולל.', en: 'Ideally, no single asset should represent more than 30% of total risk.' },
    good: { he: 'טוב: הקצאה מאוזנת. רע: ריכוז של 50%+ בנכס אחד.', en: 'Good: balanced allocation. Bad: 50%+ concentrated in a single asset.' },
    action: { he: 'אם יש ריכוז יתר, הגדר תקרת סיכון לנכס ואכוף אותה.', en: 'If over-concentrated, set a per-asset risk cap and enforce it.' },
  },
  coinPerformance: {
    what: { he: 'פירוט רווח/הפסד לפי נכס/מטבע — מראה אילו מכשירים תורמים הכי הרבה.', en: 'Per-asset P&L breakdown — shows which instruments contribute most.' },
    why: { he: 'לא כל הנכסים מתאימים לאסטרטגיה שלך באותה מידה. התמקד בנכסים שבהם יש לך יתרון.', en: 'Not every asset fits your strategy equally. Focus on the ones where you have an edge.' },
    interpret: { he: 'השווה אחוז הצלחה וממוצע R לכל נכס. אחוז הצלחה גבוה עם R נמוך יכול להיות גרוע יותר.', en: 'Compare win rate and avg R per asset. A high win rate with low R can be worse than the reverse.' },
    good: { he: 'טוב: תורמים חיוביים ברורים. רע: מפסידנים עקביים שממשיכים לסחור בהם.', en: 'Good: clear positive contributors. Bad: consistent losers you keep trading.' },
    action: { he: 'הסר או הקטן גודל בנכסים שמפסידים באופן עקבי. הגדל בנכסים עם יתרון.', en: 'Drop or downsize on assets that consistently lose. Scale up on assets with a clear edge.' },
  },
  radarScore: {
    what: { he: 'הערכת ביצועים רב-ממדית על פני 5 מדדי מסחר מרכזיים.', en: 'A multi-dimensional performance view across 5 key trading metrics.' },
    why: { he: 'מדגיש את החוזקות והחולשות שלך בתצוגה אחת.', en: 'Highlights your strengths and weaknesses in a single view.' },
    interpret: { he: 'שטח גדול יותר = ביצועים טובים יותר. חפש ממדים קורסים כדי לזהות נקודות תורפה.', en: 'Larger area = better performance. Look for collapsing axes to spot weak points.' },
    good: { he: 'טוב: צורה מאוזנת וגדולה. רע: קריסה בממד כלשהו.', en: 'Good: a balanced, large shape. Bad: collapse on any axis.' },
    action: { he: 'מקד את מאמצי השיפור בממד החלש ביותר.', en: 'Focus improvement effort on the weakest dimension.' },
  },
  rollingSharpe: {
    what: { he: 'יחס שארפ מחושב על חלון נע של עסקאות אחרונות.', en: 'Sharpe ratio computed on a rolling window of recent trades.' },
    why: { he: 'מראה האם התשואה מותאמת-סיכון שלך משתפרת או מידרדרת.', en: 'Shows whether your risk-adjusted return is improving or deteriorating.' },
    interpret: { he: 'ערכים גבוהים מעידים על תשואה טובה יותר ליחידת סיכון. ערכים יורדים מסמנים שחיקת יתרון.', en: 'Higher values mean more return per unit of risk. Falling values signal edge erosion.' },
    good: { he: 'טוב: מעל 1.0 באופן עקבי. אזהרה: מתחת ל-0.5. רע: שלילי.', en: 'Good: consistently above 1.0. Warning: below 0.5. Bad: negative.' },
    action: { he: 'אם השארפ יורד, ייתכן שאתה בחוסר התאמה לתנאי השוק. הקטן חשיפה.', en: 'If Sharpe is falling, you may be out of fit with current conditions. Reduce exposure.' },
  },
  kellyOptimal: {
    what: { he: 'האחוז האופטימלי של הון לסכן בכל עסקה בהתבסס על אחוז ההצלחה ויחס הרווח/הפסד.', en: 'The optimal percentage of capital to risk per trade based on win rate and win/loss ratio.' },
    why: { he: 'הימור גדול מדי או קטן מדי מפחית צמיחה לטווח ארוך. קלי מוצא את האופטימום המתמטי.', en: 'Betting too large or too small reduces long-term growth. Kelly finds the mathematical optimum.' },
    interpret: { he: 'זהו המקסימום התיאורטי. רוב הסוחרים משתמשים בחצי-קלי לבטיחות.', en: 'This is the theoretical maximum. Most traders use half-Kelly for safety.' },
    good: { he: 'טוב: מעל 5% (יש לך יתרון). רע: שלילי (תוחלת שלילית).', en: 'Good: above 5% (you have an edge). Bad: negative (negative expectancy).' },
    action: { he: 'השתמש בחצי-קלי כסיכון מקסימלי לעסקה. לעולם אל תחרוג מקלי מלא.', en: 'Use half-Kelly as your maximum per-trade risk. Never exceed full Kelly.' },
  },
  riskOfRuin: {
    what: { he: 'ההסתברות לאבד את כל החשבון בהינתן הסטטיסטיקות הנוכחיות.', en: 'The probability of losing the entire account given current statistics.' },
    why: { he: 'גם עם תוחלת חיובית, שונות גבוהה יכולה להוביל לחורבן. מדד זה מכמת את הסיכון.', en: 'Even with positive expectancy, high variance can lead to ruin. This metric quantifies that risk.' },
    interpret: { he: 'נמוך יותר = טוב יותר. מניח הימור שברי קבוע.', en: 'Lower = better. Assumes a fixed fractional bet.' },
    good: { he: 'טוב: מתחת ל-5%. אזהרה: 5-20%. קריטי: מעל 20%.', en: 'Good: under 5%. Warning: 5–20%. Critical: above 20%.' },
    action: { he: 'אם הסיכון גבוה, הקטן גודל פוזיציה מיידית ושפר אחוז הצלחה.', en: 'If risk is high, cut position size immediately and improve win rate.' },
  },
  edgeDecay: {
    what: { he: 'עוקב כיצד התוחלת שלך (ב-R) מתפתחת לאורך תקופות.', en: 'Tracks how your expectancy (in R) evolves across periods.' },
    why: { he: 'יתרונות נשחקים ככל שהשוק מסתגל. זיהוי מוקדם מונע הרס הון.', en: 'Edges decay as markets adapt. Early detection prevents capital destruction.' },
    interpret: { he: 'תקופות יורדות מצביעות על כך שהאסטרטגיה עלולה לאבד יעילות.', en: 'Declining periods suggest the strategy may be losing efficiency.' },
    good: { he: 'טוב: יציב או עולה. אזהרה: יורד במשך 2+ תקופות.', en: 'Good: stable or rising. Warning: declining for 2+ periods.' },
    action: { he: 'אם נשחק, חקור סטאפים חדשים או התאם קריטריוני כניסה/יציאה.', en: 'If decaying, research new setups or adjust entry/exit criteria.' },
  },
  winRateVsRR: {
    what: { he: 'מציג אחוז הצלחה לפי גודל ה-R-multiple של העסקה.', en: 'Shows win rate bucketed by the R-multiple size of the trade.' },
    why: { he: 'חושף האם אתה שומר על היתרון שלך בגדלים שונים של עסקאות.', en: 'Reveals whether you preserve your edge across different trade sizes.' },
    interpret: { he: 'באופן אידיאלי, אחוז ההצלחה נשאר עקבי או משתפר עבור יעדי R גבוהים יותר.', en: 'Ideally, win rate stays consistent or improves for higher R targets.' },
    good: { he: 'טוב: אחוז הצלחה עקבי לאורך כל הטווחים. רע: אחוז הצלחה קורס ביעדים גבוהים.', en: 'Good: consistent win rate across all buckets. Bad: win rate collapses at high targets.' },
    action: { he: 'אם אחוז ההצלחה יורד ביעדים גבוהים, ייתכן שהיעדים לא ריאליסטיים — התאם.', en: 'If win rate drops at high targets, the targets may be unrealistic — adjust them.' },
  },
  monthlyPerformance: {
    what: { he: 'פירוט רווח/הפסד חודשי עם תוחלת ביחידות R.', en: 'Monthly P&L breakdown with expectancy in R units.' },
    why: { he: 'תצוגה חודשית חושפת עונתיות, שינויי רגים ומגמה כללית.', en: 'A monthly view reveals seasonality, regime shifts, and overall trend.' },
    interpret: { he: 'חפש עקביות חודש אחרי חודש. חודש מצוין אחד לא צריך להסתיר חודשים גרועים.', en: 'Look for month-to-month consistency. One great month should not hide bad ones.' },
    good: { he: 'טוב: חודשים חיוביים עקביים. רע: חריג אחד מסתיר חודשים שליליים.', en: 'Good: consistently positive months. Bad: a single outlier hiding negative months.' },
    action: { he: 'אם החודשים לא עקביים, הקטן סיכון בתקופות שהיסטורית חלשות.', en: 'If months are inconsistent, cut risk during historically weak periods.' },
  },
  directionAnalysis: {
    what: { he: 'משווה את הביצועים שלך בין עסקאות לונג ושורט.', en: 'Compares your performance between long and short trades.' },
    why: { he: 'לרוב הסוחרים יש הטיה כיוונית. הכרת שלך עוזרת לייעל הקצאה.', en: 'Most traders have a directional bias. Knowing yours helps optimize allocation.' },
    interpret: { he: 'השווה תוחלת ב-R, לא רק רווח/הפסד, כדי לראות יתרון אמיתי לפי כיוון.', en: 'Compare R-expectancy, not just P&L, to see true edge by direction.' },
    good: { he: 'טוב: יתרון בשני הכיוונים. מקובל: יתרון ברור בכיוון אחד. רע: מפסיד בשניהם.', en: 'Good: edge in both directions. Acceptable: clear edge in one. Bad: losing in both.' },
    action: { he: 'אם כיוון אחד מפסיד באופן עקבי, הקטן או בטל את העסקאות בכיוון הזה.', en: 'If one direction consistently loses, cut or eliminate trades in that direction.' },
  },
  volatilityAdjusted: {
    what: { he: 'התוחלת שלך חלקי סטיית התקן של תשואות ה-R.', en: 'Your expectancy divided by the standard deviation of R returns.' },
    why: { he: 'מתאים לעקביות התשואות. תוחלת גבוהה עם תנודתיות גבוהה פחות אמינה.', en: 'Adjusts for return consistency. High expectancy with high volatility is less reliable.' },
    interpret: { he: 'גבוה יותר = יתרון עקבי יותר. זהו למעשה יחס שארפ במונחי R.', en: 'Higher = more consistent edge. This is essentially Sharpe in R terms.' },
    good: { he: 'טוב: מעל 0.5. מצוין: מעל 1.0. רע: מתחת ל-0.2.', en: 'Good: above 0.5. Excellent: above 1.0. Bad: below 0.2.' },
    action: { he: 'אם נמוך, התמקד בהפחתת שונות התשואות ע"י הידוק סטופים ויעדים.', en: 'If low, focus on reducing return variance by tightening stops and targets.' },
  },
  drawdownStructure: {
    what: { he: 'ממפה כל אירוע ירידה — עומק וזמן התאוששות.', en: 'Maps every drawdown event — depth and recovery time.' },
    why: { he: 'הבנת דפוסי ירידה עוזרת להגדיר ציפיות ריאליסטיות להתאוששות.', en: 'Understanding drawdown patterns helps set realistic recovery expectations.' },
    interpret: { he: 'ירידות עמוקות לוקחות זמן רב יותר להתאוששות. מספר ירידות רדודות בריא יותר מירידה עמוקה אחת.', en: 'Deep drawdowns take longer to recover. Several shallow drawdowns are healthier than one deep one.' },
    good: { he: 'טוב: ירידות מהירות ורדודות. רע: ירידות ממושכות ועמוקות.', en: 'Good: short, shallow drawdowns. Bad: prolonged, deep drawdowns.' },
    action: { he: 'אחרי ירידה עמוקה, הקטן גודל והתמקד בסטאפים עם שכנוע גבוה בלבד.', en: 'After a deep drawdown, cut size and focus only on high-conviction setups.' },
  },
  sessionPerformance: {
    what: { he: 'מפלח את הביצועים שלך לפי סשן מסחר — אסיה, לונדון וניו-יורק — לפי שעת הכניסה.', en: 'Splits performance by trading session — Asia, London, New York — based on entry time.' },
    why: { he: 'לכל סשן אופי נזילות ותנודתיות שונה. ייתכן שיש לך יתרון ברור בסשן מסוים בלבד.', en: 'Each session has its own liquidity and volatility profile. You may have a clear edge in just one.' },
    interpret: { he: 'השווה תוחלת R ואחוז הצלחה בין הסשנים, לא רק רווח גולמי. ספירת עסקאות נמוכה = פחות מהימן.', en: 'Compare R-expectancy and win rate across sessions, not just gross P&L. Low trade count = less reliable.' },
    good: { he: 'טוב: סשן אחד או שניים עם תוחלת חיובית עקבית. רע: דימום בסשן מסוים שחוזר על עצמו.', en: 'Good: one or two sessions with consistently positive expectancy. Bad: recurring bleed in a specific session.' },
    action: { he: 'רכז את הפעילות בסשן עם היתרון. הקטן או הימנע מהסשן המפסיד.', en: 'Concentrate activity in your edge session. Cut or avoid the losing session.' },
  },
  streakDistribution: {
    what: { he: 'התפלגות אורכי הרצפים — כמה רצפי ניצחון/הפסד היו ובאיזה אורך.', en: 'Distribution of streak lengths — how many win/loss streaks occurred and at what length.' },
    why: { he: 'רצפים חושפים תלות בין עסקאות והשפעה פסיכולוגית. רצפי הפסד ארוכים מסכנים הון ומשמעת.', en: 'Streaks reveal trade dependency and psychological impact. Long losing streaks threaten capital and discipline.' },
    interpret: { he: 'עמודות ירוקות = רצפי ניצחון, אדומות = רצפי הפסד. זנב ארוך באדום = סיכון לטילט.', en: 'Green bars = winning streaks, red = losing streaks. A long red tail = tilt risk.' },
    good: { he: 'טוב: רצפי הפסד קצרים (1–2). מדאיג: רצפי הפסד של 4+ שחוזרים.', en: 'Good: short losing streaks (1–2). Concerning: recurring losing streaks of 4+.' },
    action: { he: 'הגדר עצירה אחרי רצף הפסדים מוגדר מראש כדי למנוע מפולת רגשית.', en: 'Set a hard stop after a predefined losing streak to prevent an emotional collapse.' },
  },
  tradeDuration: {
    what: { he: 'מתאם בין משך החזקת העסקה לבין התוצאה ב-R.', en: 'Correlation between trade holding time and the outcome in R.' },
    why: { he: 'מגלה אם אתה מחזיק מנצחות מספיק זמן וחותך מפסידות מהר — או ההפך.', en: 'Reveals whether you hold winners long enough and cut losers fast — or the opposite.' },
    interpret: { he: 'נקודות ירוקות גבוהות מימין = סבלנות משתלמת. אדומות מימין = החזקת מפסידות יותר מדי.', en: 'Green dots high on the right = patience pays. Red dots on the right = holding losers too long.' },
    good: { he: 'טוב: מנצחות מוחזקות יותר ממפסידות. רע: חיתוך מנצחות מוקדם והחזקת מפסידות.', en: 'Good: winners held longer than losers. Bad: cutting winners early and holding losers.' },
    action: { he: 'אם מפסידות מוחזקות ארוך — הדק יציאות. אם מנצחות נחתכות — שקול trailing.', en: 'If losers are held long — tighten exits. If winners get cut — consider trailing stops.' },
  },
  feeDrag: {
    what: { he: 'אומדן השפעת העמלות על הרווח — לפי גודל פוזיציה ומינוף (הערכה, לא נתון בפועל).', en: 'Estimated fee impact on profit — based on position size and leverage (estimate, not actual fee data).' },
    why: { he: 'עמלות מצטברות שוחקות תוחלת, במיוחד בתדירות גבוהה ומינוף גבוה. לרוב לא שמים לב לזה.', en: 'Fees compound and erode expectancy, especially at high frequency and leverage. It usually goes unnoticed.' },
    interpret: { he: 'ככל שהעמודה גבוהה יותר ביחס לרווח הגולמי — העמלות אוכלות נתח גדול יותר מהיתרון שלך.', en: 'The taller the bar relative to gross profit, the bigger the bite fees take out of your edge.' },
    good: { he: 'טוב: עמלות מתחת ל-10% מהרווח הגולמי. רע: מעל 30% — היתרון נשחק.', en: 'Good: fees under 10% of gross profit. Bad: above 30% — the edge is being eroded.' },
    action: { he: 'אם הגרירה גבוהה: הפחת תדירות, השתמש בהוראות limit (maker), והקטן מינוף מיותר.', en: 'If drag is high: reduce frequency, use limit (maker) orders, and cut unnecessary leverage.' },
  },
  lag1Autocorr: {
    what: { he: 'מתאם בין תוצאת עסקה (R) לתוצאת העסקה הקודמת — האם רצף משפיע עליך.', en: 'Correlation between a trade\'s R and the previous trade\'s R — whether streaks affect you.' },
    why: { he: 'בידוד "תלות עסקאות" חושף הטיה התנהגותית: revenge-trading או overconfidence אחרי ניצחון.', en: 'Isolating trade dependency reveals behavioral bias: revenge trading or overconfidence after a win.' },
    interpret: { he: 'קרוב ל-0 = עסקאות עצמאיות (בריא). חיובי = ניצחון מוליד ניצחון (overconfidence?). שלילי = mean-reversion רגשי.', en: 'Near 0 = independent trades (healthy). Positive = wins beget wins (overconfidence?). Negative = emotional mean-reversion.' },
    good: { he: 'טוב: |ρ| < 0.15. אזהרה: |ρ| בין 0.15-0.3. רע: מעל 0.3 — תלות חזקה.', en: 'Good: |ρ| < 0.15. Warning: |ρ| between 0.15–0.3. Bad: above 0.3 — strong dependency.' },
    action: { he: 'אם המתאם חזק, כפה הפסקה מבנית בין עסקאות והפרד החלטות זו מזו.', en: 'If correlation is strong, enforce a structural break between trades and isolate each decision.' },
  },
  interTradeInterval: {
    what: { he: 'התפלגות זמני ההמתנה (בשעות) בין עסקאות עוקבות.', en: 'Distribution of waiting times (in hours) between consecutive trades.' },
    why: { he: 'דחיסות גבוהה של עסקאות סמוכות = overtrading או טילט. רווחים גדולים = סבלנות סלקטיבית.', en: 'High density of back-to-back trades = overtrading or tilt. Large gaps = selective patience.' },
    interpret: { he: 'זנב שמאלי כבד = יריות מהירות זו אחר זו. התפלגות אחידה = מסחר ממושמע.', en: 'Heavy left tail = rapid-fire trades. Even distribution = disciplined trading.' },
    good: { he: 'טוב: חציון > 4 שעות. אזהרה: רוב העסקאות בפחות משעה.', en: 'Good: median > 4 hours. Warning: most trades under an hour apart.' },
    action: { he: 'אם יש דחיסות חריגה, הוסף cooldown חובה בין עסקאות.', en: 'If density is excessive, add a mandatory cooldown between trades.' },
  },
  capitalEfficiency: {
    what: { he: 'יעילות ניצול ההון — תוחלת R מתגלגלת חלקי סטיית התקן של תשואות R.', en: 'Capital efficiency — rolling R-expectancy divided by the standard deviation of R returns.' },
    why: { he: 'גבוה = הון מייצר תשואה עקבית. נמוך = ההון "עובד קשה" עם שונות גדולה ותועלת קטנה.', en: 'High = capital generates consistent returns. Low = capital is "working hard" with high variance and little payoff.' },
    interpret: { he: 'מעל 0.5 = יעיל. מתחת ל-0.2 = ניצול חלש של הון — אולי גדלי פוזיציה לא אופטימליים.', en: 'Above 0.5 = efficient. Below 0.2 = weak capital utilization — sizing may be suboptimal.' },
    good: { he: 'טוב: עקבי מעל 0.5. רע: יורד מתחת ל-0.2 לאורך זמן.', en: 'Good: consistently above 0.5. Bad: dropping below 0.2 over time.' },
    action: { he: 'אם נמוך, הקטן גודל בעסקאות חלשות וחזק בעסקאות עם שכנוע גבוה.', en: 'If low, downsize weak trades and upsize high-conviction ones.' },
  },
  cumulativeMAR: {
    what: { he: 'יחס MAR מצטבר — תשואה כוללת (R) חלקי הנסיגה המקסימלית עד אותה נקודה.', en: 'Cumulative MAR ratio — total return (R) divided by the maximum drawdown up to that point.' },
    why: { he: 'MAR הוא מדד "איכות צמיחה": כמה תשואה אתה מקבל ליחידת כאב (drawdown).', en: 'MAR is a "growth quality" metric: how much return you get per unit of pain (drawdown).' },
    interpret: { he: 'גבוה יותר = יותר תשואה ליחידת נסיגה. מעל 1.0 = מעולה. מתחת ל-0.5 = הצמיחה לא שווה את הסיכון.', en: 'Higher = more return per unit of drawdown. Above 1.0 = excellent. Below 0.5 = growth not worth the risk.' },
    good: { he: 'מצוין: מעל 2.0. טוב: 1.0-2.0. רע: מתחת ל-0.5.', en: 'Excellent: above 2.0. Good: 1.0–2.0. Bad: below 0.5.' },
    action: { he: 'אם נמוך, הקטן גודל פוזיציה ושפר בחירת סטאפים כדי לצמצם נסיגות.', en: 'If low, cut size and improve setup selection to reduce drawdowns.' },
  },
};

function currentLang(): 'he' | 'en' {
  if (typeof document === 'undefined') return 'he';
  return document.documentElement.getAttribute('lang') === 'en' ? 'en' : 'he';
}

function localize(entry: LocalizedExplanation): ChartExplanation {
  const l = currentLang();
  return {
    what: entry.what[l],
    why: entry.why[l],
    interpret: entry.interpret[l],
    good: entry.good[l],
    action: entry.action[l],
  };
}

// Proxy that resolves to the localized explanation on every property access.
// Consumers can keep writing `EXPLANATIONS.netPnl` — the language updates
// reactively when the parent component re-renders after a lang switch.
// Getter-based plain object (NOT a Proxy — Proxies trip react-refresh's
// module-export introspection and crash on synthetic keys like $$typeof).
// Each property re-evaluates `localize()` on every access, so language
// switches reflect immediately on the next render.
export const EXPLANATIONS = {} as Record<string, ChartExplanation>;
for (const key of Object.keys(EXPLANATIONS_DATA)) {
  Object.defineProperty(EXPLANATIONS, key, {
    enumerable: true,
    configurable: false,
    get() {
      const entry = EXPLANATIONS_DATA[key];
      return entry ? localize(entry) : undefined;
    },
  });
}

