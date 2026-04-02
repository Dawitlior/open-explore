import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Dimension, MorningRitual, EODReview } from '@/hooks/use-journal-mode';

interface Props {
  isRTL: boolean;
  dimension: Dimension;
  children: ReactNode;
  activePage: string;
  onNavigate: (page: string) => void;
  onSwitchDimension: () => void;
  todayMorning?: MorningRitual | null;
  todayEOD?: EODReview | null;
  nudgeType: 'morning' | 'evening' | 'trading' | null;
  archiveOpen: boolean;
  onToggleArchive: () => void;
}

const GOLD = '#D4AF37';
const DARK_GOLD = '#B8962E';
const SLATE = '#1A1A2E';
const IVORY = '#FAF8F5';

export const JournalShell = ({
  isRTL, dimension, children, activePage,
  onNavigate, onSwitchDimension, todayMorning, todayEOD, nudgeType,
  archiveOpen, onToggleArchive,
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
      id="ritual-dimension"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: IVORY,
        overflow: 'hidden',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* Subtle warm radial glows */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `
          radial-gradient(ellipse 800px 600px at 20% 10%, rgba(212,175,55,0.04) 0%, transparent 70%),
          radial-gradient(ellipse 600px 500px at 80% 90%, rgba(212,175,55,0.03) 0%, transparent 70%)
        `,
      }} />

      {/* Floating Archive Bubble */}
      <motion.button
        onClick={onToggleArchive}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          zIndex: 150,
          width: 48, height: 48, borderRadius: '50%',
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          border: `1px solid rgba(212,175,55,0.25)`,
          boxShadow: '0 4px 20px rgba(212,175,55,0.12), 0 1px 4px rgba(0,0,0,0.04)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20,
        }}
      >
        📚
      </motion.button>

      {/* Top Bar — Minimal elegant */}
      <header style={{
        position: 'relative', zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 32px',
        borderBottom: `1px solid rgba(212,175,55,0.08)`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div>
            <div style={{
              fontSize: 20, fontWeight: 700, color: SLATE,
              fontFamily: "'Playfair Display', serif",
              letterSpacing: '0.02em',
            }}>
              Dawit <span style={{ color: GOLD, fontWeight: 400 }}>Journal</span>
            </div>
            <div style={{
              fontSize: 10, color: '#8A8A9A', letterSpacing: '0.12em',
              fontFamily: "'Inter', sans-serif",
              textTransform: 'uppercase',
            }}>
              {greeting} — {dateStr}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Ritual Status Badges */}
          {[
            { done: !!todayMorning, icon: '🌅', label: todayMorning ? 'Done' : 'Pending' },
            { done: !!todayEOD, icon: '🌙', label: todayEOD ? 'Done' : 'Pending' },
          ].map((badge, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 14px', borderRadius: 20,
              background: badge.done ? 'rgba(45,106,79,0.06)' : 'rgba(212,175,55,0.06)',
              border: `1px solid ${badge.done ? 'rgba(45,106,79,0.15)' : 'rgba(212,175,55,0.15)'}`,
            }}>
              <span style={{ fontSize: 12 }}>{badge.icon}</span>
              <span style={{
                fontSize: 10, fontWeight: 600,
                color: badge.done ? '#2D6A4F' : GOLD,
                fontFamily: "'Inter', sans-serif",
              }}>
                {badge.label}
              </span>
            </div>
          ))}

          {/* Back to Orca */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onSwitchDimension}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 18px',
              background: 'rgba(0,0,0,0.04)',
              border: '1px solid rgba(0,0,0,0.08)',
              borderRadius: 10,
              color: SLATE,
              cursor: 'pointer', fontSize: 11, fontWeight: 600,
              fontFamily: "'Inter', sans-serif",
              letterSpacing: '0.04em',
            }}
          >
            🐋 {isRTL ? 'חזור ל-Orca' : 'Back to Orca'}
          </motion.button>
        </div>
      </header>

      {/* Navigation tabs — horizontal, minimal */}
      <nav style={{
        display: 'flex', justifyContent: 'center', gap: 4,
        padding: '12px 32px',
        borderBottom: `1px solid rgba(212,175,55,0.06)`,
      }}>
        {[
          { id: 'journal-home', label: isRTL ? 'ראשי' : 'Home' },
          { id: 'morning-ritual', label: isRTL ? 'ניתוח בוקר' : 'Morning Analysis' },
          { id: 'eod-vault', label: isRTL ? 'סגירת יום' : 'Evening Reflection' },
        ].map(item => {
          const active = activePage === item.id;
          const hasNudge = (item.id === 'morning-ritual' && nudgeType === 'morning' && !todayMorning)
            || (item.id === 'eod-vault' && nudgeType === 'evening' && !todayEOD);
          return (
            <motion.button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              whileHover={{ y: -1 }}
              animate={hasNudge ? {
                boxShadow: ['0 0 0px rgba(212,175,55,0)', '0 0 12px rgba(212,175,55,0.2)', '0 0 0px rgba(212,175,55,0)'],
              } : {}}
              transition={hasNudge ? { duration: 2, repeat: Infinity } : {}}
              style={{
                padding: '8px 20px',
                background: active ? 'rgba(212,175,55,0.08)' : 'transparent',
                border: 'none',
                borderBottom: active ? `2px solid ${GOLD}` : '2px solid transparent',
                borderRadius: '8px 8px 0 0',
                color: active ? SLATE : '#8A8A9A',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                fontFamily: "'Inter', sans-serif",
                transition: 'all 0.2s',
                position: 'relative',
              }}
            >
              {item.label}
              {hasNudge && (
                <motion.span
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  style={{ fontSize: 8, color: GOLD, marginLeft: 6 }}
                >●</motion.span>
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* Main Content — Centered Zen Column */}
      <main style={{
        height: 'calc(100vh - 130px)',
        overflow: 'auto',
        display: 'flex', justifyContent: 'center',
      }}>
        <div style={{
          width: '100%', maxWidth: 1000,
          padding: '32px 40px 80px',
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
    </motion.div>
  );
};
