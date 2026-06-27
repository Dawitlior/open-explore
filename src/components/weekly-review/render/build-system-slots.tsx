// Phase 1b — System-slot bodies, restyled to Reflection Room tokens.
// Wraps each slot in MUI primitives bound to REFLECTION_TOKENS so the locked
// trade spine, stat chips, risk gauges, grade, and insights inherit the same
// Material identity as the surrounding BlockSection cards. Data flow, slot
// markers, and column behavior are unchanged — only presentation moves.
//
// The regression test in `system-slots-wiring.test.ts` guards against
// `systemSlots={{}}` ever shipping again; every slot keeps its `data-system-slot`
// attribute so that guard still bites.

import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import LinearProgress from '@mui/material/LinearProgress';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import { fmtR, fmtUSD } from '../hooks/use-review-unit';
import type { WeekGrade } from '../lib/types';
import { REFLECTION_TOKENS as RT } from '../theme/tokens';
import type { Block } from '../lib/wr-schema';
import type { SystemSlotId } from './WeeklyReviewRenderer';
import type { Trade } from '@/data/trades';

const LIMITS = { daily: -2, weekly: -5, monthly: -10 };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Theme = any;

interface WeekAggLite {
  weekKey: string;
  netR: number; netUSD: number;
  avgR: number; avgUSD: number;
  avgWinUSD: number;
  wins: number; losses: number;
  winRate: number;
}

interface BuildDeps {
  T: Theme;
  isRTL: boolean;
  L: Record<string, string>;
  tradesArr: Trade[];
  hasMoney: boolean;
  wk: WeekAggLite;
  rr: { rr: number; avgWin: number; avgLoss: number };
  n: number;
  showUSD: boolean;
  risk: { dailyUSD: number; weeklyUSD: number; monthlyUSD: number };
  isUSD: boolean;
  execScore: number;
  computedGrade: WeekGrade;
  gradeColor: string;
  fg: string; muted: string; border: string;
  cyan: string; win: string; loss: string; warn: string;
  card: React.CSSProperties;
  cardSubtle: React.CSSProperties;
  statLabel: React.CSSProperties;
  statValue: React.CSSProperties;
}

export function buildWeeklySystemSlots(
  d: BuildDeps,
): Partial<Record<SystemSlotId, (block: Block) => ReactNode>> {
  return {
    'system-trades-table': () => <TradesTableSlot {...d} />,
    'system-stat-chips':   () => <StatChipsSlot {...d} />,
    'system-risk-gauges':  () => <RiskGaugesSlot {...d} />,
    'system-grade':        () => <FinalGradeSlot {...d} />,
    'system-ai-insights':  () => <AiInsightsSlot {...d} />,
  };
}

// ── Trades table ──────────────────────────────────────────────────────────
function TradesTableSlot({ isRTL, L, tradesArr, hasMoney, n }: BuildDeps) {
  if (n === 0) {
    return (
      <Paper
        data-system-slot="trades-table"
        variant="outlined"
        sx={{
          bgcolor: RT.bg.surface2,
          borderColor: RT.divider.default,
          borderRadius: `${RT.radius.md}px`,
          py: 5, px: 2, textAlign: 'center',
        }}
      >
        <Box sx={{ fontSize: 28, mb: 1 }} aria-hidden>📊</Box>
        <Typography variant="body2" sx={{ color: RT.text.secondary }}>{L.noTrades}</Typography>
      </Paper>
    );
  }
  const numericSx = {
    fontFamily: RT.typography.fontFamilyMono,
    fontWeight: 600,
  };
  return (
    <Paper
      data-system-slot="trades-table"
      variant="outlined"
      sx={{
        bgcolor: RT.bg.surface2,
        borderColor: RT.divider.default,
        borderRadius: `${RT.radius.md}px`,
        overflowX: 'auto',
      }}
    >
      <Table size="small" sx={{ '& td, & th': { borderColor: RT.divider.default } }}>
        <TableHead>
          <TableRow sx={{ bgcolor: RT.bg.surface3 }}>
            <TableCell sx={headSx(isRTL)}>{isRTL ? 'תאריך' : 'Date'}</TableCell>
            <TableCell sx={headSx(isRTL)}>{isRTL ? 'נכס' : 'Asset'}</TableCell>
            <TableCell sx={headSx(isRTL)}>{isRTL ? 'כיוון' : 'Side'}</TableCell>
            <TableCell sx={headSx(isRTL, 'right')}>R</TableCell>
            {hasMoney && <TableCell sx={headSx(isRTL, 'right')}>$ P&amp;L</TableCell>}
            <TableCell sx={headSx(isRTL)}>{isRTL ? 'תוצאה' : 'Result'}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {tradesArr.map((t) => {
            const r = Number(t.returnR) || 0;
            const usd = Number(t.pnl) || 0;
            const sideColor = t.direction === 'Long' ? RT.accent.success : RT.accent.error;
            const resultColor =
              t.winLoss === 'Win' ? RT.accent.success
              : t.winLoss === 'Loss' ? RT.accent.error
              : RT.text.secondary;
            return (
              <TableRow key={t.id} hover sx={{ '&:hover': { bgcolor: RT.bg.surface3 } }}>
                <TableCell sx={{ color: RT.text.primary, fontSize: 13 }}>{t.date}</TableCell>
                <TableCell sx={{ color: RT.text.primary, fontSize: 13 }}>{t.coin}</TableCell>
                <TableCell sx={{ color: sideColor, fontSize: 13, fontWeight: 600 }}>{t.direction}</TableCell>
                <TableCell align="right" sx={{ ...numericSx, color: r >= 0 ? RT.accent.success : RT.accent.error }}>
                  {fmtR(r)}
                </TableCell>
                {hasMoney && (
                  <TableCell align="right" sx={{ ...numericSx, color: usd >= 0 ? RT.accent.success : RT.accent.error }}>
                    {fmtUSD(usd)}
                  </TableCell>
                )}
                <TableCell sx={{ color: resultColor, fontSize: 13, fontWeight: 600 }}>{t.winLoss}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Paper>
  );
}

function headSx(isRTL: boolean, align?: 'right') {
  return {
    color: RT.text.secondary,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.8px',
    textTransform: 'uppercase' as const,
    textAlign: (align ?? (isRTL ? 'right' : 'left')) as 'right' | 'left',
  };
}

// ── Stat chips ────────────────────────────────────────────────────────────
function StatChipsSlot({ L, wk, rr, n, showUSD }: BuildDeps) {
  return (
    <Box
      data-system-slot="stat-chips"
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 1.25,
      }}
    >
      <StatCard label={L.rr} value={rr.avgLoss === 0 ? '—' : (rr.rr ? rr.rr.toFixed(2) : '0.00')} color={RT.text.primary} />
      <DualStatCard
        label={L.winR}
        r={fmtR(rr.avgWin)} d={fmtUSD(wk.avgWinUSD)} isUSD={showUSD}
        color={RT.accent.success}
      />
      <DualStatCard
        label={L.avgR}
        r={fmtR(wk.avgR)} d={fmtUSD(wk.avgUSD)} isUSD={showUSD}
        color={wk.avgR >= 0 ? RT.accent.success : RT.accent.error}
      />
      <StatCard
        label={L.winRate}
        value={`${Math.round(wk.winRate * 100)}%`}
        color={wk.winRate >= 0.5 ? RT.accent.success : RT.accent.error}
      />
      <StatCard label={L.tradesK} value={String(n)} color={RT.text.primary} />
      <DualStatCard
        label={L.netR}
        r={fmtR(wk.netR)} d={fmtUSD(wk.netUSD)} isUSD={showUSD}
        color={wk.netR >= 0 ? RT.accent.success : RT.accent.error}
      />
    </Box>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        bgcolor: RT.bg.surface2,
        borderColor: RT.divider.default,
        borderRadius: `${RT.radius.md}px`,
        p: 1.5,
        display: 'flex', flexDirection: 'column', gap: 0.5,
        minHeight: 64,
      }}
    >
      <Typography variant="caption" sx={{ color: RT.text.secondary, textTransform: 'uppercase' }}>
        {label}
      </Typography>
      <Typography sx={{ fontFamily: RT.typography.fontFamilyMono, fontWeight: 700, fontSize: 18, color }}>
        {value}
      </Typography>
    </Paper>
  );
}

function DualStatCard({ label, r, d, isUSD, color }: {
  label: string; r: string; d: string; isUSD: boolean; color: string;
}) {
  const main = isUSD ? d : r;
  const sub = isUSD ? r : d;
  return (
    <Paper
      variant="outlined"
      sx={{
        bgcolor: RT.bg.surface2,
        borderColor: RT.divider.default,
        borderRadius: `${RT.radius.md}px`,
        p: 1.5,
        display: 'flex', flexDirection: 'column', gap: 0.25,
        minHeight: 72,
      }}
    >
      <Typography variant="caption" sx={{ color: RT.text.secondary, textTransform: 'uppercase' }}>
        {label}
      </Typography>
      <Typography sx={{ fontFamily: RT.typography.fontFamilyMono, fontWeight: 700, fontSize: 18, color }}>
        {main}
      </Typography>
      <Typography sx={{ fontFamily: RT.typography.fontFamilyMono, fontSize: 11, fontWeight: 600, color: RT.text.secondary, opacity: 0.85 }}>
        {sub}
      </Typography>
    </Paper>
  );
}

// ── Risk gauges ───────────────────────────────────────────────────────────
function RiskGaugesSlot({ isRTL, L, wk, risk, isUSD }: BuildDeps) {
  return (
    <Box
      data-system-slot="risk-gauges"
      sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 1.5 }}
    >
      <RiskCard label={L.daily}   limitR={LIMITS.daily}   limitUSD={-risk.dailyUSD}
                valueR={0} valueUSD={0} isUSD={isUSD} isRTL={isRTL} />
      <RiskCard label={L.weekly}  limitR={LIMITS.weekly}  limitUSD={-risk.weeklyUSD}
                valueR={wk.netR  < 0 ? wk.netR  : 0} valueUSD={wk.netUSD < 0 ? wk.netUSD : 0}
                isUSD={isUSD} isRTL={isRTL} />
      <RiskCard label={L.monthly} limitR={LIMITS.monthly} limitUSD={-risk.monthlyUSD}
                valueR={0} valueUSD={0} isUSD={isUSD} isRTL={isRTL} />
    </Box>
  );
}

function RiskCard({ label, limitR, limitUSD, valueR, valueUSD, isUSD, isRTL }: {
  label: string; limitR: number; limitUSD: number; valueR: number; valueUSD: number;
  isUSD: boolean; isRTL: boolean;
}) {
  const limit = isUSD ? limitUSD : limitR;
  const value = isUSD ? valueUSD : valueR;
  const pct = Math.min(100, Math.max(0, (Math.abs(value) / Math.max(1e-9, Math.abs(limit))) * 100));
  const tone = pct >= 80 ? RT.accent.error : pct >= 50 ? RT.accent.warning : RT.accent.success;
  const mainStr = isUSD
    ? (value === 0 ? '$0' : fmtUSD(value))
    : (value === 0 ? '0.0R' : fmtR(value));
  const subStr = isUSD ? (valueR === 0 ? '0.0R' : fmtR(valueR))
                       : (valueUSD === 0 ? '$0' : fmtUSD(valueUSD));
  const limitStr = isUSD ? `${fmtUSD(limitUSD)}` : `${limitR}R`;
  return (
    <Paper
      variant="outlined"
      sx={{
        bgcolor: RT.bg.surface2,
        borderColor: RT.divider.default,
        borderRadius: `${RT.radius.md}px`,
        p: 1.75,
        textAlign: isRTL ? 'right' : 'left',
      }}
    >
      <Typography variant="caption" sx={{ color: RT.text.secondary, textTransform: 'uppercase', letterSpacing: '1px' }}>
        {label}
      </Typography>
      <Typography sx={{
        fontFamily: RT.typography.fontFamilyMono, fontWeight: 800, fontSize: 22,
        color: value < 0 ? RT.accent.error : RT.accent.success, mt: 0.5,
      }}>
        {mainStr}
      </Typography>
      <Typography sx={{
        fontFamily: RT.typography.fontFamilyMono, fontSize: 11, fontWeight: 600,
        color: RT.text.secondary, opacity: 0.8, mt: 0.25,
      }}>
        {subStr}
      </Typography>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          mt: 1.25, height: 6, borderRadius: 3,
          bgcolor: RT.divider.default,
          '& .MuiLinearProgress-bar': { bgcolor: tone, borderRadius: 3 },
        }}
      />
      <Typography sx={{ color: RT.text.secondary, fontSize: 10, mt: 0.75, textAlign: isRTL ? 'left' : 'right' }}>
        {isRTL ? 'מגבלה:' : 'Limit:'} {limitStr}
      </Typography>
    </Paper>
  );
}

// ── Final grade ───────────────────────────────────────────────────────────
function FinalGradeSlot({ isRTL, computedGrade }: BuildDeps) {
  const gradeBucket = (g: WeekGrade): 'success' | 'warning' | 'error' => {
    if ((RT.thresholds.grade.success as readonly string[]).includes(g)) return 'success';
    if ((RT.thresholds.grade.warning as readonly string[]).includes(g)) return 'warning';
    return 'error';
  };
  const bucketColor = (b: 'success' | 'warning' | 'error') =>
    b === 'success' ? RT.accent.success : b === 'warning' ? RT.accent.warning : RT.accent.error;

  const buckets: Array<{ g: 'A+' | 'B' | 'C'; bucket: 'success' | 'warning' | 'error' }> = [
    { g: 'A+', bucket: 'success' },
    { g: 'B',  bucket: 'warning' },
    { g: 'C',  bucket: 'warning' },
  ];
  const currentBucket = gradeBucket(computedGrade);
  const currentColor = bucketColor(currentBucket);

  return (
    <Box data-system-slot="final-grade">
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.25 }}>
        {buckets.map(({ g, bucket }) => {
          const active = computedGrade === g
            || (g === 'C' && (computedGrade === 'D' || computedGrade === 'F'));
          const color = bucketColor(bucket);
          return (
            <Paper
              key={g}
              variant="outlined"
              sx={{
                p: 2, textAlign: 'center',
                bgcolor: active ? `${color}14` : RT.bg.surface2,
                borderColor: active ? `${color}88` : RT.divider.default,
                borderRadius: `${RT.radius.md}px`,
                transition: 'all 200ms cubic-bezier(0.2,0,0,1)',
              }}
            >
              <Typography sx={{
                color: active ? color : RT.text.secondary,
                fontFamily: RT.typography.fontFamilyMono,
                fontWeight: 700, fontSize: 14,
              }}>
                {gradeLabel(g, isRTL)}
              </Typography>
            </Paper>
          );
        })}
      </Box>
      <Stack direction="row" spacing={1} sx={{ mt: 1.5, alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="caption" sx={{ color: RT.text.secondary }}>
          {isRTL ? 'מחושב:' : 'Computed:'}
        </Typography>
        <Chip
          label={computedGrade}
          size="small"
          sx={{
            bgcolor: `${currentColor}1a`,
            color: currentColor,
            border: `1px solid ${currentColor}66`,
            fontFamily: RT.typography.fontFamilyMono,
            fontWeight: 800,
            letterSpacing: '0.5px',
          }}
        />
      </Stack>
    </Box>
  );
}

// ── AI insights placeholder ───────────────────────────────────────────────
function AiInsightsSlot({ L }: BuildDeps) {
  return (
    <Alert
      data-system-slot="ai-insights"
      severity="info"
      icon={<span aria-hidden style={{ fontSize: 18 }}>💡</span>}
      sx={{
        bgcolor: `${RT.accent.info}14`,
        color: RT.text.primary,
        border: `1px solid ${RT.accent.info}44`,
        borderRadius: `${RT.radius.md}px`,
        '& .MuiAlert-icon': { color: RT.accent.info },
      }}
    >
      {L.noInsights}
    </Alert>
  );
}

function gradeLabel(g: 'A+' | 'B' | 'C', isRTL: boolean) {
  const he: Record<string, string> = { 'A+': 'מעולה (A+)', B: 'עמדתי בחוקים (B)', C: 'טעון שיפור (C)' };
  const en: Record<string, string> = { 'A+': 'Excellent (A+)', B: 'Within rules (B)', C: 'Needs work (C)' };
  return isRTL ? he[g] : en[g];
}
