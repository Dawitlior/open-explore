// Single card primitive used by ReflectionBoard. Thin wrapper around
// BlockSection (MUI Card) that adds:
//   • equal-height contract (`height: 100%`)
//   • optional step-number watermark (top-trailing, low opacity)
//   • optional actions slot (used by EditableCardShell in customize mode)
//
// All the inner-card content rendering still flows through BlockSection
// so existing tests that assert on `[data-reflection-section]` keep
// passing.

import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import { BlockSection } from '../blocks/BlockSection';
import { REFLECTION_TOKENS as T } from '../../theme/tokens';

interface Props {
  title?: string;
  emoji?: string;
  isRTL: boolean;
  chromeless?: boolean;
  /** Optional step badge displayed in the top-trailing corner. */
  step?: number;
  /** Optional actions row rendered below the content (edit mode). */
  actions?: ReactNode;
  children: ReactNode;
}

export function ReflectionCard({ title, emoji, isRTL, chromeless, step, actions, children }: Props) {
  // Chromeless cards (e.g. risk band) skip the watermark + Card chrome.
  if (chromeless) {
    return (
      <Box sx={{ width: '100%', height: '100%' }}>
        <BlockSection title={title} emoji={emoji} isRTL={isRTL} chromeless>
          {children}
        </BlockSection>
        {actions && <Box sx={{ mt: 1 }}>{actions}</Box>}
      </Box>
    );
  }

  return (
    <Box
      data-reflection-card
      sx={{
        position: 'relative',
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        // Make BlockSection (immediate Card child) stretch.
        '& > [data-reflection-section]': { height: '100%', display: 'flex', flexDirection: 'column' },
        '& > [data-reflection-section] > .MuiCardContent-root': { flex: 1 },
      }}
    >
      <BlockSection title={title} emoji={emoji} isRTL={isRTL}>
        {children}
        {actions && <Box sx={{ mt: 1.5 }}>{actions}</Box>}
      </BlockSection>

      {typeof step === 'number' && (
        <Box
          aria-hidden
          data-step-badge
          sx={{
            position: 'absolute',
            top: 8,
            ...(isRTL ? { left: 10 } : { right: 10 }),
            fontFamily: T.typography.fontFamilyMono,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: T.text.disabled,
            opacity: 0.55,
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          {String(step).padStart(2, '0')}
        </Box>
      )}
    </Box>
  );
}

export default ReflectionCard;
