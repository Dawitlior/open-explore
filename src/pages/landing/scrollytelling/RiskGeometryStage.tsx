import * as React from 'react';
import { motion, useMotionValueEvent, useTransform } from 'framer-motion';
import { ScrollStage } from './ScrollStage';

/**
 * Phase 4 — Geometric Edge Object.
 *
 * A sticky scrollytelling stage that renders your trading "edge" as a live
 * pentagonal data-object. Each vertex represents a core quantitative metric
 * (Win-Rate, Avg R:R, Profit Factor, Expectancy, Consistency). As the reader
 * scrolls, the polygon inflates from a neutral inner ring outward to its true
 * shape — visually communicating that an "edge" isn't a single number, it's
 * the *geometry* of five aligned metrics.
 *
 * Non-destructive: this stage is inserted BEFORE the existing Edge/Risk
 * section. All existing CTAs, IDs, and Supabase wiring remain untouched.
 */
interface Props {
  isRTL: boolean;
  t: (he: string, en: string) => string;
}

type Axis = {
  key: string;
  label: string;
  value: string;
  hint: string;
  /** 0..1 — final magnitude of this vertex */
  mag: number;
  color: string;
};

const CX = 260;
const CY = 260;
const R_MAX = 200;
const R_MIN = 40;

export const RiskGeometryStage: React.FC<Props> = ({ isRTL, t }) => {
  const axes: Axis[] = React.useMemo(() => ([
    { key: 'wr', label: t('Win Rate', 'Win Rate'),          value: '62%',   hint: t('מהעסקאות סגורות ברווח', 'of trades close in profit'),      mag: 0.72, color: '#22D3EE' },
    { key: 'rr', label: t('Avg R:R',  'Avg R:R'),           value: '2.4R',  hint: t('יחס תגמול-לסיכון ממוצע', 'average reward-to-risk ratio'),  mag: 0.86, color: '#8B5CF6' },
    { key: 'pf', label: t('Profit Factor', 'Profit Factor'),value: '3.1',   hint: t('רווח גולמי ÷ הפסד גולמי', 'gross profit ÷ gross loss'),    mag: 0.94, color: '#34D399' },
    { key: 'ex', label: t('Expectancy', 'Expectancy'),      value: '+0.9R', hint: t('רווח ממוצע לעסקה ב-R', 'avg R gained per trade'),         mag: 0.68, color: '#F59E0B' },
    { key: 'co', label: t('Consistency', 'Consistency'),    value: '81/100',hint: t('סטיית תוצאות שבועית', 'weekly result stability'),          mag: 0.78, color: '#3B82F6' },
  ]), [t]);

  return (
    <section aria-labelledby="edge-geometry-heading" style={{ background: 'transparent' }}>
      <ScrollStage heightVh={1.8}>
        {({ progress, reduced, isMobile }) => (
          <StageContent
            axes={axes}
            progress={progress}
            reduced={reduced}
            isMobile={isMobile}
            isRTL={isRTL}
            t={t}
          />
        )}
      </ScrollStage>
    </section>
  );
};

const StageContent: React.FC<{
  axes: Axis[];
  progress: React.ComponentProps<typeof motion.div>['style'] extends infer S ? any : any;
  reduced: boolean;
  isMobile: boolean;
  isRTL: boolean;
  t: (he: string, en: string) => string;
}> = ({ axes, progress, reduced, isMobile, isRTL, t }) => {
  const disabled = reduced || isMobile;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: disabled ? 'auto' : '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: disabled ? '48px 20px' : '40px 24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 1180,
          display: 'grid',
          gridTemplateColumns: disabled ? '1fr' : '1fr 1.05fr',
          gap: 40,
          alignItems: 'center',
        }}
      >
        {/* Copy column */}
        <div style={{ order: isRTL && !disabled ? 2 : 1 }}>
          <div
            className="mono"
            style={{
              fontSize: 11,
              letterSpacing: '0.22em',
              color: '#22D3EE',
              opacity: 0.9,
              marginBottom: 14,
            }}
          >
            EDGE · GEOMETRY
          </div>
          <h2
            id="edge-geometry-heading"
            style={{
              fontSize: 'clamp(1.75rem, 3.4vw, 2.6rem)',
              fontWeight: 800,
              lineHeight: 1.15,
              margin: '0 0 16px',
              color: 'var(--text)',
            }}
          >
            {isRTL ? (
              <>
                ה-Edge שלך הוא לא מספר —{' '}
                <span style={{ background: 'linear-gradient(90deg,#22D3EE,#8B5CF6)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
                  זו צורה גיאומטרית.
                </span>
              </>
            ) : (
              <>
                Your edge isn't a number —{' '}
                <span style={{ background: 'linear-gradient(90deg,#22D3EE,#8B5CF6)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
                  it's a geometric shape.
                </span>
              </>
            )}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 15, lineHeight: 1.75, margin: '0 0 18px' }}>
            {t(
              'סוחר רווחי לא נמדד בציון אחד. חמישה קודקודים — Win Rate, R:R, Profit Factor, Expectancy, Consistency — יוצרים יחד את חתימת ה-Edge שלך. כאשר צורה זו סימטרית ומלאה, יש לך Edge יציב. כאשר היא מעוותת, המערכת מזהה במדויק איפה החולשה.',
              'A profitable trader is not defined by a single score. Five vertices — Win Rate, R:R, Profit Factor, Expectancy and Consistency — together form your edge signature. When this shape is symmetric and full, your edge is stable. When it is distorted, the system identifies exactly where the weakness lives.'
            )}
          </p>
          <p style={{ color: 'var(--text-dim)', fontSize: 13, lineHeight: 1.7, margin: 0 }}>
            {t(
              'גלול כדי לראות איך צורת ה-Edge שלך נפרשת מציר הבסיס אל צורתה האמיתית.',
              'Scroll to watch your edge shape unfold from the baseline ring outward to its true geometry.'
            )}
          </p>

          {/* Axis legend — bilingual chips */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 22 }}>
            {axes.map(a => (
              <div key={a.key} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 10,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border)',
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: 2,
                  background: a.color, boxShadow: `0 0 10px ${a.color}`,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600 }}>{a.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>{a.hint}</div>
                </div>
                <div className="mono" style={{ fontSize: 12, color: a.color, fontWeight: 700 }}>{a.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Geometry column */}
        <div style={{ order: isRTL && !disabled ? 1 : 2, display: 'flex', justifyContent: 'center' }}>
          <EdgePolygon axes={axes} progress={progress} disabled={disabled} />
        </div>
      </div>
    </div>
  );
};

/* ─────────── Polygon renderer ─────────── */

const EdgePolygon: React.FC<{
  axes: Axis[];
  progress: any;
  disabled: boolean;
}> = ({ axes, progress, disabled }) => {
  const n = axes.length;
  // Angles: start at -90deg (top), evenly spaced
  const angleFor = (i: number) => (-Math.PI / 2) + (i * 2 * Math.PI / n);

  // Refs to per-vertex circles + polygon
  const polyRef = React.useRef<SVGPolygonElement>(null);
  const vertRefs = React.useRef<(SVGCircleElement | null)[]>([]);
  const labelRefs = React.useRef<(SVGGElement | null)[]>([]);

  // Per-vertex reveal windows staggered along scroll
  const windows = React.useMemo(() => {
    return axes.map((_, i) => {
      const start = 0.05 + (i / n) * 0.55;
      const end = start + 0.35;
      return [start, Math.min(end, 0.98)] as const;
    });
  }, [axes, n]);

  const computePoints = React.useCallback((p: number) => {
    return axes.map((a, i) => {
      const [s, e] = windows[i];
      const local = Math.max(0, Math.min(1, (p - s) / (e - s)));
      // ease-out cubic
      const eased = 1 - Math.pow(1 - local, 3);
      const radius = R_MIN + (R_MAX * a.mag - R_MIN) * eased;
      const ang = angleFor(i);
      return {
        x: CX + Math.cos(ang) * radius,
        y: CY + Math.sin(ang) * radius,
        localOpacity: 0.35 + 0.65 * eased,
      };
    });
  }, [axes, windows]);

  // Static (disabled) render
  if (disabled) {
    const pts = computePoints(1);
    return <PolygonSvg axes={axes} points={pts} disabled />;
  }

  // Live sync via a single listener → mutate DOM directly (60fps friendly)
  useMotionValueEvent(progress, 'change', (v: number) => {
    const pts = computePoints(v);
    if (polyRef.current) {
      polyRef.current.setAttribute('points', pts.map(p => `${p.x},${p.y}`).join(' '));
    }
    pts.forEach((pt, i) => {
      const c = vertRefs.current[i];
      if (c) {
        c.setAttribute('cx', String(pt.x));
        c.setAttribute('cy', String(pt.y));
        c.setAttribute('opacity', String(pt.localOpacity));
      }
      const lbl = labelRefs.current[i];
      if (lbl) {
        lbl.setAttribute('opacity', String(pt.localOpacity));
      }
    });
  });

  const initial = computePoints(0);
  return (
    <PolygonSvg
      axes={axes}
      points={initial}
      polyRef={polyRef}
      vertRefs={vertRefs}
      labelRefs={labelRefs}
    />
  );
};

const PolygonSvg: React.FC<{
  axes: Axis[];
  points: { x: number; y: number; localOpacity: number }[];
  disabled?: boolean;
  polyRef?: React.RefObject<SVGPolygonElement>;
  vertRefs?: React.MutableRefObject<(SVGCircleElement | null)[]>;
  labelRefs?: React.MutableRefObject<(SVGGElement | null)[]>;
}> = ({ axes, points, disabled, polyRef, vertRefs, labelRefs }) => {
  const n = axes.length;
  const angleFor = (i: number) => (-Math.PI / 2) + (i * 2 * Math.PI / n);

  // Background rings + axis spokes
  const rings = [0.25, 0.5, 0.75, 1].map(k => R_MAX * k);
  const axisEnds = axes.map((_, i) => {
    const ang = angleFor(i);
    return { x: CX + Math.cos(ang) * R_MAX, y: CY + Math.sin(ang) * R_MAX };
  });

  // Label positions — pushed a bit outside the max ring
  const labelAt = (i: number) => {
    const ang = angleFor(i);
    return {
      x: CX + Math.cos(ang) * (R_MAX + 34),
      y: CY + Math.sin(ang) * (R_MAX + 34),
    };
  };

  const polyPoints = points.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <svg
      viewBox="0 0 520 520"
      style={{
        width: '100%',
        maxWidth: 520,
        height: 'auto',
        filter: 'drop-shadow(0 0 40px rgba(34,211,238,0.10))',
      }}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="edgeFill" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#22D3EE" stopOpacity="0.35" />
          <stop offset="60%"  stopColor="#8B5CF6" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.05" />
        </radialGradient>
        <linearGradient id="edgeStroke" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#22D3EE" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>

      {/* Concentric rings */}
      {rings.map((r, i) => (
        <circle key={i} cx={CX} cy={CY} r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={1}
          strokeDasharray={i === rings.length - 1 ? '0' : '3 4'}
        />
      ))}

      {/* Axis spokes */}
      {axisEnds.map((p, i) => (
        <line key={i}
          x1={CX} y1={CY} x2={p.x} y2={p.y}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={1}
        />
      ))}

      {/* Edge polygon */}
      <polygon
        ref={polyRef}
        points={polyPoints}
        fill="url(#edgeFill)"
        stroke="url(#edgeStroke)"
        strokeWidth={2}
        strokeLinejoin="round"
        style={{
          willChange: disabled ? undefined : 'transform',
          transition: disabled ? 'none' : undefined,
        }}
      />

      {/* Vertex points */}
      {points.map((p, i) => (
        <circle
          key={`v-${i}`}
          ref={el => { if (vertRefs) vertRefs.current[i] = el; }}
          cx={p.x}
          cy={p.y}
          r={5}
          fill={axes[i].color}
          opacity={p.localOpacity}
          style={{ filter: `drop-shadow(0 0 6px ${axes[i].color})` }}
        />
      ))}

      {/* Labels around the polygon */}
      {axes.map((a, i) => {
        const pos = labelAt(i);
        // horizontal alignment based on side
        const cos = Math.cos(angleFor(i));
        const anchor = Math.abs(cos) < 0.2 ? 'middle' : cos > 0 ? 'start' : 'end';
        return (
          <g
            key={`l-${i}`}
            ref={el => { if (labelRefs) labelRefs.current[i] = el; }}
            opacity={points[i].localOpacity}
          >
            <text
              x={pos.x} y={pos.y - 4}
              textAnchor={anchor}
              fill={a.color}
              style={{
                fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                fontSize: 10,
                letterSpacing: '0.14em',
                fontWeight: 700,
              }}
            >
              {a.label.toUpperCase()}
            </text>
            <text
              x={pos.x} y={pos.y + 12}
              textAnchor={anchor}
              fill="#F5F7FA"
              style={{
                fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                fontSize: 13,
                fontWeight: 800,
              }}
            >
              {a.value}
            </text>
          </g>
        );
      })}

      {/* Center readout */}
      <g>
        <circle cx={CX} cy={CY} r={22} fill="rgba(10,13,20,0.85)" stroke="rgba(34,211,238,0.35)" />
        <text
          x={CX} y={CY + 4}
          textAnchor="middle"
          fill="#22D3EE"
          style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 11, fontWeight: 800, letterSpacing: '0.12em' }}
        >
          EDGE
        </text>
      </g>
    </svg>
  );
};
