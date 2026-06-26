// Phase 0 gate: RTL emotion cache flips logical properties.
// Renders an emotion-styled element with padding-left under direction='rtl'
// and asserts the RTL stylis plugin rewrites it to padding-right.

/** @jsxImportSource @emotion/react */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { css } from '@emotion/react';
import { ReflectionThemeProvider } from '../ReflectionThemeProvider';

const padLeft = css`
  padding-left: 16px;
`;

describe('Reflection theme — emotion RTL cache', () => {
  it('flips padding-left → padding-right under RTL', () => {
    render(
      <ReflectionThemeProvider direction="rtl">
        <div css={padLeft} data-testid="el">שלום</div>
      </ReflectionThemeProvider>,
    );
    const styles = Array.from(document.querySelectorAll('style'))
      .map((s) => s.textContent || '')
      .join('\n');
    expect(styles).toMatch(/padding-right\s*:\s*16px/i);
  });

  it('keeps padding-left under LTR', () => {
    render(
      <ReflectionThemeProvider direction="ltr">
        <div css={padLeft} data-testid="el-ltr">hello</div>
      </ReflectionThemeProvider>,
    );
    const styles = Array.from(document.querySelectorAll('style'))
      .map((s) => s.textContent || '')
      .join('\n');
    expect(styles).toMatch(/padding-left\s*:\s*16px/i);
  });
});
