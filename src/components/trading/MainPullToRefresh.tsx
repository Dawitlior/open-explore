import { ReactNode } from 'react';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { PullToRefreshIndicator } from './PullToRefreshIndicator';

interface Props {
  isMobile: boolean;
  accent: string;
  children: ReactNode;
}

/**
 * MainPullToRefresh — wraps the dashboard <main> scroll container and
 * adds an iOS-style pull-to-refresh gesture on mobile only.
 * Desktop renders a plain <main> with no listeners attached.
 */
export const MainPullToRefresh = ({ isMobile, accent, children }: Props) => {
  const { ref, pull, progress, refreshing } = usePullToRefresh({
    enabled: isMobile,
    threshold: 64,
    onRefresh: () => new Promise<void>(r => setTimeout(r, 650)),
  });
  return (
    <main
      ref={ref as any}
      style={{
        flex: 1,
        overflow: 'auto',
        transition: 'background 0.4s ease',
        position: 'relative',
        WebkitOverflowScrolling: 'touch',
      } as any}
    >
      {isMobile && (
        <PullToRefreshIndicator pull={pull} progress={progress} refreshing={refreshing} color={accent} />
      )}
      <div
        style={{
          transform: pull ? `translateY(${pull}px)` : undefined,
          transition: pull && !refreshing ? 'none' : 'transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
          willChange: 'transform',
        }}
      >
        {children}
      </div>
    </main>
  );
};
