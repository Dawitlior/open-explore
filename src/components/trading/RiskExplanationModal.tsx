import { useState } from 'react';
import type { TradingTheme } from '@/lib/trading-theme';
import { GlassCard } from './TradingUI';

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

export const RiskExplanationModal = ({ T, isRTL, tradeId, riskChange, onSave, onClose }: RiskExplanationModalProps) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [customNote, setCustomNote] = useState('');

  const handleSave = () => {
    if (!selected) return;
    const reason = REASONS.find(r => r.id === selected);
    onSave({
      tradeId,
      reason: reason ? (isRTL ? reason.he : reason.en) : selected,
      customNote: customNote.trim() || undefined,
      timestamp: new Date().toISOString(),
    });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)', animation: 'fadeIn 0.2s ease' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: T.bg.card, border: `1px solid ${T.border.medium}`, borderRadius: 18, padding: 28, maxWidth: 480, width: '92%', boxShadow: T.shadow.elevated, animation: 'scaleIn 0.25s cubic-bezier(0.16,1,0.3,1)' }}>
        <div style={{ fontSize: 24, textAlign: 'center', marginBottom: 8 }}>⚠️</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: T.text.primary, textAlign: 'center', marginBottom: 6, fontFamily: "'JetBrains Mono', monospace" }}>
          {isRTL ? 'זוהה שינוי בסיכון' : 'Risk Change Detected'}
        </div>
        <div style={{ fontSize: 12, color: T.accent.orange, textAlign: 'center', marginBottom: 18, fontFamily: "'JetBrains Mono', monospace" }}>
          {riskChange}
        </div>
        <div style={{ fontSize: 11, color: T.text.muted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {isRTL ? 'מה הסיבה לשינוי?' : 'What caused this change?'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          {REASONS.map(r => (
            <button
              key={r.id}
              onClick={() => setSelected(r.id)}
              style={{
                padding: '10px 12px',
                background: selected === r.id ? `${T.accent.cyan}15` : T.bg.tertiary,
                border: `1px solid ${selected === r.id ? T.accent.cyan : T.border.subtle}`,
                borderRadius: 10,
                color: selected === r.id ? T.accent.cyan : T.text.secondary,
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: selected === r.id ? 600 : 400,
                textAlign: isRTL ? 'right' : 'left',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span style={{ fontSize: 16 }}>{r.icon}</span>
              <span>{isRTL ? r.he : r.en}</span>
            </button>
          ))}
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 9, color: T.text.dim, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>
            {isRTL ? 'הערה נוספת (אופציונלי)' : 'Additional note (optional)'}
          </label>
          <textarea
            value={customNote}
            onChange={e => setCustomNote(e.target.value)}
            placeholder={isRTL ? 'הוסף הקשר...' : 'Add context...'}
            style={{ width: '100%', padding: '8px 10px', background: T.bg.tertiary, border: `1px solid ${T.border.medium}`, borderRadius: 8, color: T.text.primary, fontSize: 12, fontFamily: "'Inter', sans-serif", outline: 'none', minHeight: 50, resize: 'vertical' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 18px', background: T.bg.tertiary, border: `1px solid ${T.border.medium}`, borderRadius: 10, color: T.text.secondary, cursor: 'pointer', fontSize: 12 }}>
            {isRTL ? 'דלג' : 'Skip'}
          </button>
          <button
            onClick={handleSave}
            disabled={!selected}
            style={{
              padding: '8px 22px',
              background: selected ? `linear-gradient(135deg, ${T.accent.cyan}, ${T.accent.teal})` : T.bg.tertiary,
              border: 'none',
              borderRadius: 10,
              color: selected ? T.bg.primary : T.text.dim,
              fontWeight: 700,
              cursor: selected ? 'pointer' : 'default',
              fontSize: 12,
              transition: 'all 0.2s',
            }}
          >
            {isRTL ? 'שמור' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};
