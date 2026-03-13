import { ReactNode, useRef, useState, useEffect } from 'react';

interface LazyChartProps {
  children: ReactNode;
  height?: number;
  placeholder?: ReactNode;
}

/**
 * LazyChart — only renders chart children when the container is visible in the viewport.
 * Uses IntersectionObserver for performance with many charts.
 */
export const LazyChart = ({ children, height = 200, placeholder }: LazyChartProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} style={{ minHeight: height }}>
      {visible ? children : (
        placeholder || (
          <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.3 }}>
            <div style={{ width: 24, height: 24, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        )
      )}
    </div>
  );
};
