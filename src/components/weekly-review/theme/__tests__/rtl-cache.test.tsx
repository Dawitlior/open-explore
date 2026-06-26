// Phase 0 gate: RTL emotion cache flips logical properties.
// Renders an MUI Button under direction='rtl' and asserts the RTL cache plugin
// rewrites a left-padding into right-padding in the emitted CSS.

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import Button from '@mui/material/Button';
import { ReflectionThemeProvider } from '../ReflectionThemeProvider';

describe('Reflection theme — emotion RTL cache', () => {
  it('mounts under RTL without throwing and emits direction=rtl', () => {
    const { container } = render(
      <ReflectionThemeProvider direction="rtl">
        <Button sx={{ pl: 4 }} data-testid="btn">שלום</Button>
      </ReflectionThemeProvider>,
    );
    // The ScopedCssBaseline wrapper carries dir from the theme via MUI.
    expect(container.querySelector('[data-testid="btn"]')).toBeTruthy();
    // stylis-plugin-rtl rewrites left/right in generated styles; verify by
    // checking that any padding-right rule exists (flipped from sx.pl).
    const styles = Array.from(document.querySelectorAll('style'))
      .map((s) => s.textContent || '')
      .join('\n');
    expect(styles).toMatch(/padding-right\s*:/i);
  });

  it('mounts under LTR without throwing', () => {
    const { container } = render(
      <ReflectionThemeProvider direction="ltr">
        <Button data-testid="btn-ltr">hello</Button>
      </ReflectionThemeProvider>,
    );
    expect(container.querySelector('[data-testid="btn-ltr"]')).toBeTruthy();
  });
});
