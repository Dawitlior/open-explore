import { useState, useEffect, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TradingTheme } from '@/lib/trading-theme';
import type { Dimension, MorningRitual, EODReview } from '@/hooks/use-journal-mode';

interface Props {
  T: TradingTheme;
  isRTL: boolean;
  dimension: Dimension;
  children: ReactNode;
  activePage: string;
  onNavigate: (page: string) => void;
  onSwitchDimension: () => void;
  todayMorning?: MorningRitual | null;
  todayEOD?: EODReview | null;
  nudgeType: 'morning' | 'evening' | 'trading' | null;
}

const journalNav = [
  { id: 'journal-home', icon: '🧘', label: 'Journal Home', labelHe: 'יומן ראשי' },
  { id: 'morning-ritual', icon: '🌅', label: 'Morning Ritual', labelHe: 'טקס בוקר' },
  { id: 'eod-vault', icon: '🌙', label: 'EOD Vault', labelHe: 'סגירת יום' },
  { id: 'journal-archive', icon: '📚', label: 'Archive', labelHe: 'ארכיון' },
  { id: 'psychology', icon: '🧠', label: 'Psychology', labelHe: 'פסיכולוגיה' },
  { id: 'weekly-review', icon: '📋', label: 'Weekly Review', labelHe: 'סקירה שבועית' },
];

export const JournalShell = ({
  T, isRTL, dimension, children, activePage,
  onNavigate, onSwitchDimension, todayMorning, todayEOD, nudgeType,
}: Props) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const iv = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(iv);
  }, []);

  const hour = time.getHours();
  const greeting = hour < 12
    ? (isRTL ? 'בוקר טוב' : 'Good Morning')
    : hour < 17
    ? (isRTL ? 'צהריים טובים' : 'Good Afternoon')
    : (isRTL ? 'ערב טוב' : 'Good Evening');

  const dateStr = time.toLocaleDateString(isRTL ? 'he-IL' : 'en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: '#080614',
        overflow: 'hidden',
        fontFamily: "'Playfair Display', 'Georgia', serif",
      }}
    >
      {/* Ambient background glows */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `
          radial-gradient(ellipse 800px 600px at 20% 20%, rgba(99,72,180,0.08) 0%, transparent 70%),
          radial-gradient(ellipse 600px 500px at 80% 80%, rgba(59,42,120,0.06) 0%, transparent 70%),
          radial-gradient(ellipse 400px 400px at 50% 50%, rgba(120,100,200,0.04) 0%, transparent 70%)
        `,
      }} />

      {/* Top Bar */}
      <header style={{
        position: 'relative', zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 28px',
        borderBottom: '1px solid rgba(196,181,253,0.06)',
        backdropFilter: 'blur(20px)',
        background: 'rgba(8,6,20,0.8)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 22 }}>🧘</span>
          <div>
            <div style={{
              fontSize: 18, fontWeight: 400, color: '#c4b5fd',
              fontFamily: "'Playfair Display', serif",
              letterSpacing: '0.05em',
            }}>
              Dawit <span style={{ color: '#a78bfa', fontWeight: 300 }}>Journal</span>
            </div>
            <div style={{
              fontSize: 10, color: '#7c75a8', letterSpacing: '0.15em',
              fontFamily: "'IBM Plex Mono', 'JetBrains Mono', monospace",
              textTransform: 'uppercase',
            }}>
              {greeting} — {dateStr}
            </div>
          </div>
        </div>

        {/* Ritual Status Indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', borderRadius: 20,
            background: todayMorning ? 'rgba(134,239,172,0.08)' : 'rgba(251,191,36,0.08)',
            border: `1px solid ${todayMorning ? 'rgba(134,239,172,0.2)' : 'rgba(251,191,36,0.2)'}`,
          }}>
            <span style={{ fontSize: 12 }}>🌅</span>
            <span style={{
              fontSize: 10, fontWeight: 600,
              color: todayMorning ? '#86efac' : '#fbbf24',
              fontFamily: "'IBM Plex Mono', monospace",
            }}>
              {todayMorning ? (isRTL ? 'הושלם' : 'Done') : (isRTL ? 'ממתין' : 'Pending')}
            </span>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', borderRadius: 20,
            background: todayEOD ? 'rgba(134,239,172,0.08)' : 'rgba(251,191,36,0.08)',
            border: `1px solid ${todayEOD ? 'rgba(134,239,172,0.2)' : 'rgba(251,191,36,0.2)'}`,
          }}>
            <span style={{ fontSize: 12 }}>🌙</span>
            <span style={{
              fontSize: 10, fontWeight: 600,
              color: todayEOD ? '#86efac' : '#fbbf24',
              fontFamily: "'IBM Plex Mono', monospace",
            }}>
              {todayEOD ? (isRTL ? 'הושלם' : 'Done') : (isRTL ? 'ממתין' : 'Pending')}
            </span>
          </div>

          {/* Back to Orca */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onSwitchDimension}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 16px',
              background: 'linear-gradient(135deg, rgba(0,242,255,0.06), rgba(0,242,255,0.12))',
              border: '1px solid rgba(0,242,255,0.2)',
              borderRadius: 10,
              color: '#00F2FF',
              cursor: 'pointer', fontSize: 11, fontWeight: 600,
              fontFamily: "'IBM Plex Mono', monospace",
              letterSpacing: '0.04em',
            }}
          >
            🐋 {isRTL ? 'חזור ל-Orca' : 'Back to Orca'}
          </motion.button>
        </div>
      </header>

      {/* Content Area — Centered Zen Column */}
      <div style={{
        display: 'flex', height: 'calc(100vh - 64px)',
        overflow: 'hidden',
      }}>
        {/* Mini Sidebar Nav */}
        <nav style={{
          width: 200, minWidth: 200,
          padding: '20px 10px',
          borderRight: isRTL ? 'none' : '1px solid rgba(196,181,253,0.06)',
          borderLeft: isRTL ? '1px solid rgba(196,181,253,0.06)' : 'none',
          display: 'flex', flexDirection: 'column', gap: 4,
          background: 'rgba(8,6,20,0.5)',
          backdropFilter: 'blur(12px)',
        }}>
          {journalNav.map(item => {
            const active = activePage === item.id;
            const hasNudge = (item.id === 'morning-ritual' && nudgeType === 'morning' && !todayMorning)
              || (item.id === 'eod-vault' && nudgeType === 'evening' && !todayEOD);
            return (
              <motion.button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                whileHover={{ x: isRTL ? -3 : 3 }}
                animate={hasNudge ? {
                  boxShadow: ['0 0 0px rgba(196,181,253,0)', '0 0 12px rgba(196,181,253,0.3)', '0 0 0px rgba(196,181,253,0)'],
                } : {}}
                transition={hasNudge ? { duration: 2, repeat: Infinity } : {}}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px',
                  background: active
                    ? 'linear-gradient(135deg, rgba(196,181,253,0.08), rgba(196,181,253,0.04))'
                    : 'transparent',
                  border: 'none',
                  borderRadius: 10,
                  color: active ? '#c4b5fd' : '#7c75a8',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  fontFamily: "'Playfair Display', serif",
                  textAlign: isRTL ? 'right' : 'left',
                  width: '100%',
                  transition: 'all 0.2s',
                  borderLeft: !isRTL && active ? '2px solid #c4b5fd' : '2px solid transparent',
                  borderRight: isRTL && active ? '2px solid #c4b5fd' : '2px solid transparent',
                  position: 'relative',
                }}
              >
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                <span>{isRTL ? item.labelHe : item.label}</span>
                {hasNudge && (
                  <motion.span
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    style={{ fontSize: 8, color: '#fbbf24' }}
                  >●</motion.span>
                )}
              </motion.button>
            );
          })}
        </nav>

        {/* Main Content — Zen Column */}
        <main style={{
          flex: 1, overflow: 'auto',
          display: 'flex', justifyContent: 'center',
        }}>
          <div style={{
            width: '100%', maxWidth: 1000,
            padding: '32px 40px',
          }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activePage}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </motion.div>
  );
};
