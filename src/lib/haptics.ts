/**
 * Haptics — intentional, restrained vibration cues.
 * Patterns inspired by iOS UIImpactFeedbackGenerator.
 * All calls are no-ops on non-supporting devices.
 */
const v = (pattern: number | number[]) => {
  try { (navigator as any).vibrate?.(pattern); } catch { /* noop */ }
};

export const haptics = {
  /** Subtle tick — selection change, chip pick. */
  selection: () => v(6),
  /** Light tap — primary button, nav switch. */
  light: () => v(10),
  /** Medium thud — threshold crossed, swipe-reveal. */
  medium: () => v(18),
  /** Success — two soft pulses. */
  success: () => v([10, 40, 14]),
  /** Warning — sharp burst. */
  warning: () => v([22, 60, 22]),
  /** Long press confirmed. */
  longPress: () => v(14),
};
