// Phase 1 — Fill-mode section shell (MUI Card).
// Used when editMode === false. Replaces the inline-styled <section> with a
// Material outlined card built from REFLECTION_TOKENS. Edit-mode section shell
// is untouched (Phase 3 owns the customize-mode redesign).

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import type { ReactNode } from 'react';
import { REFLECTION_TOKENS as T } from '../../theme/tokens';

interface Props {
  title?: string;
  emoji?: string;
  isRTL: boolean;
  chromeless?: boolean;
  children: ReactNode;
}

export function BlockSection({ title, emoji, isRTL, chromeless, children }: Props) {
  if (chromeless) {
    return (
      <Stack spacing={1.5} sx={{ width: '100%' }}>
        {children}
      </Stack>
    );
  }
  return (
    <Card
      variant="outlined"
      data-reflection-section
      sx={{
        bgcolor: T.bg.surface1,
        borderColor: T.divider.default,
        borderRadius: `${T.radius.lg}px`,
        boxShadow: T.elevation.e1,
        overflow: 'visible',
        width: '100%',
      }}
    >
      <CardContent
        sx={{
          p: { xs: `${T.spacing.md}px`, sm: `${T.spacing.lg}px` },
          '&:last-child': { pb: { xs: `${T.spacing.md}px`, sm: `${T.spacing.lg}px` } },
        }}
      >
        {title && (
          <Stack
            direction={isRTL ? 'row-reverse' : 'row'}
            alignItems="center"
            spacing={1}
            sx={{ mb: 1.5 }}
          >
            {emoji && (
              <Box
                aria-hidden
                sx={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}
              >
                {emoji}
              </Box>
            )}
            <Typography
              variant="h2"
              sx={{
                color: T.text.primary,
                textAlign: isRTL ? 'right' : 'left',
                flex: 1,
                minWidth: 0,
              }}
            >
              {title}
            </Typography>
          </Stack>
        )}
        <Stack spacing={1.5} sx={{ width: '100%' }}>
          {children}
        </Stack>
      </CardContent>
    </Card>
  );
}

export default BlockSection;
