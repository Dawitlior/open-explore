// Reflection Room — MUI theme factory (Phase 0)
// Always dark. Direction-aware (LTR/RTL). Built strictly from REFLECTION_TOKENS.

import { createTheme, type Theme } from '@mui/material/styles';
import { REFLECTION_TOKENS as T } from './tokens';

export type Direction = 'ltr' | 'rtl';

export function createReflectionTheme(direction: Direction): Theme {
  return createTheme({
    direction,
    palette: {
      mode: 'dark',
      background: { default: T.bg.app, paper: T.bg.surface1 },
      text: {
        primary: T.text.primary,
        secondary: T.text.secondary,
        disabled: T.text.disabled,
      },
      divider: T.divider.default,
      primary: { main: T.accent.info, contrastText: T.text.inverse },
      success: { main: T.accent.success, contrastText: T.text.inverse },
      warning: { main: T.accent.warning, contrastText: T.text.inverse },
      error:   { main: T.accent.error,   contrastText: T.text.inverse },
      info:    { main: T.accent.info,    contrastText: T.text.inverse },
    },
    shape: { borderRadius: T.radius.md },
    spacing: 4, // 4px base; xs=1, sm=2, md=3, lg=4, xl=6, xxl=8
    typography: {
      fontFamily: T.typography.fontFamilyUI,
      h1: T.typography.h1,
      h2: T.typography.h2,
      h3: T.typography.h3,
      body1: T.typography.body1,
      body2: T.typography.body2,
      caption: T.typography.caption,
    },
    transitions: {
      duration: {
        shortest: T.motion.durFast,
        shorter:  T.motion.durFast,
        short:    T.motion.durStd,
        standard: T.motion.durStd,
        complex:  T.motion.durSlow,
        enteringScreen: T.motion.durStd,
        leavingScreen:  T.motion.durStd,
      },
      easing: {
        easeInOut: T.motion.easeStd,
        easeOut:   T.motion.easeOut,
        easeIn:    T.motion.easeIn,
        sharp:     T.motion.easeStd,
      },
    },
  });
}
