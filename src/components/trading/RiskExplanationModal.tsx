import { useEffect, useRef, useState } from 'react';
import type { TradingTheme } from '@/lib/trading-theme';
import { infoColor } from '@/lib/semantic-color';

export interface RiskExplanation {
  tradeId: number;
  reason: string;
  customNote?: string;
  timestamp: string;
}

interface RiskExplanationModalProps {
  T: TradingTheme;
  isRTL: boolean;
  tradeId: number;
  riskChange: string;
  onSave: (explanation: RiskExplanation) => void;
  onClose: () => void;
}

const REASONS = [
  { id: 'high-conviction', en: 'High Conviction Setup', he: 'סטאפ בשכנוע גבוה', icon: '🎯' },
  { id: 'volatility', en: 'Market Volatility Adjustment', he: 'התאמה לתנודתיות השוק', icon: '📊' },
  { id: 'recovering', en: 'Recovering from a Loss', he: 'התאוששות מהפסד', icon: '🔄' },
  { id: 'testing', en: 'Testing a Strategy', he: 'בדיקת אסטרטגיה', icon: '🧪' },
  { id: 'scaling', en: 'Scaling Into Position', he: 'הגדלה הדרגתית', icon: '📈' },
  { id: 'discretionary', en: 'Discretionary Decision', he: 'החלטה שיקולית', icon: '🧠' },
  { id: 'news', en: 'News / Catalyst Event', he: 'אירוע חדשותי / קטליסט', icon: '📰' },
  { id: 'emotional', en: 'Emotional / Impulsive', he: 'רגשי / אימפולסיבי', icon: '💥' },
];

const CUSTOM = '__custom__';

export const RiskExplanationModal = ({ T, isRTL, tradeId, riskChange, onSave, onClose }: RiskExplanationModalProps) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [customNote, setCustomNote] = useState('');
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const L = (he: string, en: string) => (isRTL ? he : en);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const trimmed = customNote.trim();
  const canSave = (selected !== null && selected !== CUSTOM) || trimmed.length > 0;

  const handleSave = () => {
    if (!canSave) return;
    const reason = REASONS.find(r => r.id === selected);
    onSave({
      tradeId,
      reason: reason ? (isRTL ? reason.he : reason.en) : L('סיבה חופשית', 'Own words'),
      customNote: trimmed || undefined,
      timestamp: new Date().toISOString(),
    });
  };

  const mono = "'JetBrains Mono', monospace";

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 150,
        background: 'rgba(2, 8, 20, 0.68)', backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%', maxWidth: 560, maxHeight: '88dvh', overflowY: 'auto',
          background: T.bg.card,
          border: `1px solid ${T.border.medium}`,
          borderRadius: 22,
          boxShadow: T.shadow.elevated,
          animation: 'scaleIn 0.25s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {/* header */}
        <div style={{
          position: 'relative',
          padding: '22px 24px 18px',
          borderBottom: `1px solid ${T.border.subtle}`,
          background: `linear-gradient(180deg, ${T.state.warn}14, transparent)`,
          borderRadius: '22px 22px 0 0',
        }}>
          <button
            onClick={onClose}
            aria-label={L('סגור', 'Close')}
            className="orca-focus"
            style={{
              position: 'absolute', top: 14, insetInlineEnd: 14,
              width: 30, height: 30, borderRadius: 999, cursor: 'pointer',
              background: T.bg.tertiary, border: `1px solid ${T.border.subtle}`,
              color: T.text.muted, fontSize: 14, lineHeight: 1,
            }}
          >×</button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: `${T.state.warn}1A`, border: `1px solid ${T.state.warn}55`,
              fontSize: 18,
            }}>⚠️</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: T.text.primary, fontFamily: mono, letterSpacing: 0.3 }}>
                {L('זוהה שינוי בסיכון', 'Risk Change Detected')}
              </div>
              <div style={{ fontSize: 11.5, color: T.text.muted, marginTop: 3, lineHeight: 1.5 }}>
                {L('רגע אחד — תעד למה שינית את הסיכון. זה מה שהופך דפוס לתובנה.',
                   'One moment — log why the risk changed. This is what turns a pattern into insight.')}
              </div>
            </div>
          </div>

          <div style={{
            marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 12px', borderRadius: 999,
            background: `${T.state.warn}12`, border: `1px solid ${T.state.warn}44`,
            color: T.state.warn, fontFamily: mono, fontSize: 12, fontWeight: 700,
          }}>
            {riskChange}
          </div>
        </div>

        {/* body */}
        <div style={{ padding: '18px 24px 22px' }}>
          <div style={{ fontSize: 10, color: T.text.muted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
            {L('מה הסיבה לשינוי?', 'What caused this change?')}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 8, marginBottom: 10 }}>
            {REASONS.map(r => {
              const active = selected === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setSelected(active ? null : r.id)}
                  aria-pressed={active}
                  className="orca-focus"
                  style={{
                    padding: '11px 12px',
                    background: active ? `${infoColor(T)}14` : T.bg.tertiary,
                    border: `1px solid ${active ? infoColor(T) : T.border.subtle}`,
                    borderRadius: 12,
                    color: active ? T.text.primary : T.text.secondary,
                    cursor: 'pointer',
                    fontSize: 11.5,
                    fontWeight: active ? 700 : 500,
                    textAlign: isRTL ? 'right' : 'left',
                    transition: 'all 0.15s ease',
                    display: 'flex', alignItems: 'center', gap: 9,
                  }}
                >
                  <span style={{ fontSize: 15 }}>{r.icon}</span>
                  <span style={{ minWidth: 0 }}>{isRTL ? r.he : r.en}</span>
                </button>
              );
            })}
          </div>

          {/* free-text option */}
          <button
            onClick={() => { setSelected(CUSTOM); setTimeout(() => areaRef.current?.focus(), 0); }}
            aria-pressed={selected === CUSTOM}
            className="orca-focus"
            style={{
              width: '100%', padding: '11px 12px', marginBottom: 14,
              background: selected === CUSTOM ? `${infoColor(T)}14` : 'transparent',
              border: `1px dashed ${selected === CUSTOM ? infoColor(T) : T.border.medium}`,
              borderRadius: 12, cursor: 'pointer',
              color: selected === CUSTOM ? T.text.primary : T.text.secondary,
              fontSize: 11.5, fontWeight: 600,
              textAlign: isRTL ? 'right' : 'left',
              display: 'flex', alignItems: 'center', gap: 9,
            }}
          >
            <span style={{ fontSize: 15 }}>✍️</span>
            <span>{L('אני אכתוב בעצמי', 'I’ll write my own reason')}</span>
          </button>

          <label style={{ fontSize: 9.5, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6, fontWeight: 700 }}>
            {selected === CUSTOM
              ? L('הסיבה שלך', 'Your reason')
              : L('הערה נוספת (אופציונלי)', 'Additional note (optional)')}
          </label>
          <textarea
            ref={areaRef}
            value={customNote}
            maxLength={1000}
            onChange={e => setCustomNote(e.target.value.slice(0, 1000))}
            placeholder={L('למשל: הגדלתי כי הסטאפ חזר על עצמו שלוש פעמים…', 'e.g. Scaled up because the setup repeated three times…')}
            style={{
              width: '100%', padding: '10px 12px', background: T.bg.tertiary,
              border: `1px solid ${T.border.medium}`, borderRadius: 12,
              color: T.text.primary, fontSize: 12.5, lineHeight: 1.5,
              fontFamily: "'Inter', sans-serif", outline: 'none',
              minHeight: 76, resize: 'vertical',
            }}
          />
          <div style={{ fontSize: 9.5, color: T.text.muted, marginTop: 5, textAlign: isRTL ? 'left' : 'right', fontFamily: mono }}>
            {customNote.length}/1000
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16, flexWrap: 'wrap' }}>
            <button
              onClick={onClose}
              className="orca-focus"
              style={{
                padding: '10px 20px', background: 'transparent',
                border: `1px solid ${T.border.medium}`, borderRadius: 12,
                color: T.text.secondary, cursor: 'pointer', fontSize: 12, fontWeight: 600,
              }}
            >
              {L('דלג', 'Skip')}
            </button>
            <button
              onClick={handleSave}
              disabled={!canSave}
              className="orca-focus"
              style={{
                padding: '10px 26px',
                background: canSave ? infoColor(T) : T.bg.tertiary,
                border: `1px solid ${canSave ? infoColor(T) : T.border.subtle}`,
                borderRadius: 12,
                color: canSave ? T.bg.primary : T.text.muted,
                fontWeight: 800, fontSize: 12,
                cursor: canSave ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s ease',
              }}
            >
              {L('שמור', 'Save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
