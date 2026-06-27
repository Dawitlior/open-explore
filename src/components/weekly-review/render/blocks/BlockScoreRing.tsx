// Phase 1 — ScoreRing block (fill mode display).
// Restores the SVG donut killed during Wave-0 (legacy parity) and binds color
// to the locked 80/50 thresholds defined in theme/tokens. Computed read-only.
// Fix: render single "{score}%" inside ring; never use error color on unfilled state.

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { REFLECTION_TOKENS as T } from '../../theme/tokens';
import type { Block, ReviewValues, ChecklistState, Loc } from '../../lib/wr-schema';
import { resolveLoc } from '../../lib/wr-schema';

interface Props {
  block: Block;
  values: ReviewValues;
  locale: 'he' | 'en';
  isRTL: boolean;
}

function scoreColor(score: number, hasData: boolean): string {
  // No data yet — never paint red on an unfilled state.
  if (!hasData) return T.accent.neutral;
  if (score >= T.thresholds.score.success) return T.accent.success;
  if (score >= T.thresholds.score.warning) return T.accent.warning;
  return T.accent.error;
}

export function BlockScoreRing({ block, values, locale, isRTL }: Props) {
  const cfg = block.config || {};
  const source = cfg.source as string | undefined;
  const max = (cfg.scoreMax as number | undefined) ?? 100;

  let score = 0;
  let hasData = false;
  if (source && cfg.method === 'checklist_percent') {
    const items = (values[source] as Record<string, ChecklistState> | undefined) || {};
    const set = Object.values(items).filter((s) => s !== 'neutral');
    const good = set.filter((s) => s === 'done').length;
    hasData = set.length > 0;
    score = hasData ? Math.round((good / set.length) * max) : 0;
  }

  const color = scoreColor(score, hasData);
  const pct = max > 0 ? Math.min(1, Math.max(0, score / max)) : 0;

  const size = 96;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const dash = C * pct;
  const label = resolveLoc(block.label as Loc | undefined, locale);
  const help = resolveLoc(block.helpText as Loc | undefined, locale);
  const ariaScore = max === 100 ? `${score}%` : `${score} of ${max}`;

  return (
    <Stack
      direction={isRTL ? 'row-reverse' : 'row'}
      spacing={2}
      sx={{ alignItems: 'center', py: 1 }}
    >
      <Box
        component="svg"
        role="img"
        aria-label={`Execution score ${ariaScore}`}
        viewBox={`0 0 ${size} ${size}`}
        sx={{ width: size, height: size, flexShrink: 0 }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={T.divider.strong}
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${C}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dasharray 320ms cubic-bezier(0.2,0,0,1)' }}
        />
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          fill={color}
          style={{
            fontFamily: T.typography.fontFamilyMono,
            fontSize: 20,
            fontWeight: 700,
          }}
        >
          {`${score}%`}
        </text>
      </Box>
      <Box sx={{ minWidth: 0, textAlign: isRTL ? 'right' : 'left' }}>
        {label && (
          <Typography variant="h3" sx={{ color: T.text.primary }}>
            {label}
          </Typography>
        )}
        {help && (
          <Typography variant="body2" sx={{ color: T.text.secondary, mt: 0.5 }}>
            {help}
          </Typography>
        )}
        <Typography
          variant="caption"
          sx={{
            display: 'inline-block',
            mt: 1,
            px: 1,
            py: 0.25,
            borderRadius: `${T.radius.pill}px`,
            bgcolor: `${color}22`,
            color,
            fontFamily: T.typography.fontFamilyMono,
            letterSpacing: '0.5px',
          }}
        >
          {`${score}%`}
        </Typography>
      </Box>
    </Stack>
  );
}

export default BlockScoreRing;
