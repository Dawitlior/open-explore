import type { TradingTheme } from '@/lib/trading-theme';

interface ChartExplanation {
  what: string;
  why: string;
  interpret: string;
  good: string;
  action: string;
}

interface ChartExplanationModalProps {
  T: TradingTheme;
  isRTL: boolean;
  title: string;
  explanation: ChartExplanation;
  chartId?: string;
  onRemove?: (chartId: string) => void;
  onClose: () => void;
}

export const ChartExplanationModal = ({ T, isRTL, title, explanation, chartId, onRemove, onClose }: ChartExplanationModalProps) => {
  const labels = isRTL
    ? ['מה זה מודד', 'למה זה חשוב', 'איך לפרש', 'טוב מול רע', 'מה לעשות']
    : ['What it measures', 'Why it matters', 'How to interpret', 'Good vs Bad', 'Action to take'];

  const icons = ['📐', '⚡', '🔍', '⚖️', '🎯'];

  return (
    <div
      data-bottom-sheet-overlay
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(6px)', animation: 'fadeIn 0.2s ease'
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        data-bottom-sheet
        style={{
          background: `linear-gradient(165deg, ${T.bg.card} 0%, ${T.bg.secondary} 100%)`,
          border: `1px solid ${T.border.medium}`, borderRadius: T.radius.xl,
          padding: 32, maxWidth: 520, width: '92%', maxHeight: '80vh', overflowY: 'auto',
          boxShadow: T.shadow.elevated, animation: 'scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 9, color: T.accent.cyan, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 4 }}>
              {isRTL ? 'הסבר מדד' : 'Metric Explanation'}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: T.text.primary, fontFamily: "'JetBrains Mono', monospace" }}>
              📊 {title}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.text.muted, fontSize: 22, cursor: 'pointer', padding: 4 }}>×</button>
        </div>

        {/* Explanation sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[explanation.what, explanation.why, explanation.interpret, explanation.good, explanation.action].map((text, i) => (
            <div key={i} style={{
              padding: 14, borderRadius: T.radius.md,
              background: `${T.bg.tertiary}`,
              border: `1px solid ${T.border.subtle}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 14 }}>{icons[i]}</span>
                <div style={{ fontSize: 10, color: T.accent.cyan, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>
                  {labels[i]}
                </div>
              </div>
              <div style={{ fontSize: 13, color: T.text.secondary, lineHeight: 1.7, direction: isRTL ? 'rtl' : 'ltr' }}>
                {text}
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
          {chartId && onRemove && (
            <button onClick={() => { onRemove(chartId); onClose(); }} style={{
              padding: '8px 16px', fontSize: 12, background: `${T.accent.red}10`, border: `1px solid ${T.accent.red}25`,
              borderRadius: T.radius.md, color: T.accent.red, cursor: 'pointer', fontWeight: 600
            }}>
              {isRTL ? 'הסר מהדאשבורד' : 'Remove from Dashboard'}
            </button>
          )}
          <button onClick={onClose} style={{
            padding: '8px 20px', fontSize: 12,
            background: `linear-gradient(135deg, ${T.accent.cyan}, ${T.accent.teal})`,
            border: 'none', borderRadius: T.radius.md, color: T.bg.primary,
            cursor: 'pointer', fontWeight: 700
          }}>
            {isRTL ? 'הבנתי' : 'Got it'}
          </button>
        </div>
      </div>
    </div>
  );
};
