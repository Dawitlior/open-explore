// Reflection Room — Theme provider (Phase 0)
// Wires emotion cache (RTL-aware), MUI ThemeProvider, scoped CssBaseline.
// Phase 0 is intentionally inert: mounts the providers but does not restyle
// any existing component. Component swaps land in later phases.

import { useMemo, type ReactNode } from 'react';
import createCache from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
import { ThemeProvider } from '@mui/material/styles';
import ScopedCssBaseline from '@mui/material/ScopedCssBaseline';
import { prefixer } from 'stylis';
import rtlPlugin from 'stylis-plugin-rtl';
import { createReflectionTheme, type Direction } from './reflection-theme';

interface Props {
  direction: Direction;
  children: ReactNode;
}

export const ReflectionThemeProvider = ({ direction, children }: Props) => {
  const cache = useMemo(
    () =>
      createCache({
        key: direction === 'rtl' ? 'mui-rtl' : 'mui',
        stylisPlugins: direction === 'rtl' ? [rtlPlugin, prefixer] : [prefixer],
      }),
    [direction],
  );

  const theme = useMemo(() => createReflectionTheme(direction), [direction]);

  return (
    <CacheProvider value={cache}>
      <ThemeProvider theme={theme}>
        {/* Scoped baseline — does not leak resets outside this subtree. */}
        <ScopedCssBaseline enableColorScheme={false} sx={{ bgcolor: 'transparent' }}>
          {children}
        </ScopedCssBaseline>
      </ThemeProvider>
    </CacheProvider>
  );
};

export default ReflectionThemeProvider;
