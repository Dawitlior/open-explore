import { ReactNode } from 'react';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { PullToRefreshIndicator } from './PullToRefreshIndicator';

interface Props {
  isMobile: boolean;
  accent: string;
  children: ReactNode;
}

/**
 * MainPullToRefresh — adds iOS pull-to-refresh on mobile only.
 *
 * Critical rules to avoid breaking native scroll and dimension transitions:
 *  - On desktop, render a plain <main> with NO extra wrapper div or transform.
 *  - On mobile, only apply transform/transition to the inner wrapper when
 *    the user is actively pulling or refreshing. When idle, the inner div
 *    has no transform (no stacking-context trap), so iOS momentum scroll
 *    and `position: sticky` work normally.
 */
export const MainPullToRefresh = ({ isMobile, accent, children }: Props) => {
  // ── Desktop: pure passthrough, no listeners, no wrappers ──────────────
  if (!isMobile) {
    return (
      <main id="main" style={{ flex: 1, minWidth: 0, overflow: 'auto', transition: 'background 0.4s ease' }}>
        {children}
      </main>
    );
  }

  // ── Mobile: gesture-enabled main ──────────────────────────────────────
  const { ref, pull, progress, refreshing } = usePullToRefresh({
    enabled: true,
    threshold: 64,
    onRefresh: () => new Promise<void>(r => setTimeout(r, 600)),
  });

  const active = pull > 0 || refreshing;

  return (
    <main
      id="main"
      ref={ref as any}
      style={{
        flex: 1,
        minWidth: 0,
        overflow: 'auto',
        transition: 'background 0.4s ease',
        position: 'relative',
        WebkitOverflowScrolling: 'touch',
      } as any}
    >
      <PullToRefreshIndicator pull={pull} progress={progress} refreshing={refreshing} color={accent} />
      <div
        style={
          active
            ? {
                width: '100%',
                minWidth: 0,
                boxSizing: 'border-box',
                transform: `translate3d(0, ${pull}px, 0)`,
                transition: refreshing ? 'transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
                willChange: 'transform',
              }
            : { width: '100%', minWidth: 0, boxSizing: 'border-box' }
        }
      >
        {children}
      </div>
    </main>
  );
};
