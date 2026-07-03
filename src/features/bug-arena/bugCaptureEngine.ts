// =====================================================================
//  ORCA · BUG ARENA — Capture engine
// =====================================================================
//  Zero framework dependency. Pure DOM + Canvas.
//  Three jobs:
//    1) ElementPicker  — "inspect-and-tap" the broken element (desktop + touch)
//    2) captureViewport — html2canvas screenshot with the picked element ringed
//    3) annotation utils — burn the user's drawings onto the screenshot
//
//  html2canvas is loaded lazily and is OPTIONAL. If it isn't installed,
//  capture degrades gracefully: you still get the element selector + rect,
//  and the user can attach their own image. To enable auto-screenshots:
//      npm i html2canvas
// =====================================================================

import type { CaptureContext, ElementRect, Viewport } from './bugArenaTypes';

const OVERLAY_ATTR = 'data-orca-bug-overlay';
const Z = 2147483600; // just under max z-index

// ---------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------
function cssEscape(value: string): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const C: any = typeof CSS !== 'undefined' ? CSS : null;
  if (C && typeof C.escape === 'function') return C.escape(value);
  return value.replace(/([^a-zA-Z0-9_-])/g, '\\$1');
}

export function getCurrentRoute(): string {
  if (typeof window === 'undefined') return '';
  return window.location.pathname + (window.location.hash || '');
}

export function getViewport(): Viewport {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    dpr: window.devicePixelRatio || 1,
  };
}

export function collectContext(): CaptureContext {
  return {
    capturedAt: new Date().toISOString(),
    route: getCurrentRoute(),
    url: typeof window !== 'undefined' ? window.location.href : null,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    language: typeof navigator !== 'undefined' ? navigator.language : 'he',
    viewport: getViewport(),
  };
}

/** Build a reasonably-stable, reasonably-unique CSS selector for an element. */
export function buildSelector(el: Element | null): string {
  if (!el || el.nodeType !== 1) return '';

  // 1) explicit test hooks win — best signal for a developer
  const testId =
    el.getAttribute('data-testid') ||
    el.getAttribute('data-test') ||
    el.getAttribute('data-cy');
  if (testId) return `[data-testid="${cssEscape(testId)}"]`;

  // 2) a unique id
  if (el.id && document.querySelectorAll(`#${cssEscape(el.id)}`).length === 1) {
    return `#${cssEscape(el.id)}`;
  }

  // 3) walk up, building a short path of tag:nth-of-type
  const parts: string[] = [];
  let node: Element | null = el;
  let depth = 0;

  while (node && node.nodeType === 1 && depth < 6) {
    const tag = node.tagName.toLowerCase();
    if (tag === 'html' || tag === 'body') break;

    if (node.id && document.querySelectorAll(`#${cssEscape(node.id)}`).length === 1) {
      parts.unshift(`#${cssEscape(node.id)}`);
      break;
    }

    let part = tag;
    const parent: Element | null = node.parentElement;
    if (parent) {
      const sameTag = Array.from(parent.children).filter(
        (c) => c.tagName === node!.tagName
      );
      if (sameTag.length > 1) {
        part += `:nth-of-type(${sameTag.indexOf(node) + 1})`;
      }
    }
    parts.unshift(part);
    node = node.parentElement;
    depth++;
  }
  return parts.join(' > ');
}

/** A short human label for the element: tag + a snippet of its text. */
export function buildLabel(el: Element | null): string {
  if (!el) return '';
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : '';
  const txt = (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40);
  return `<${tag}${id}>${txt ? ` · "${txt}"` : ''}`;
}

export function rectOf(el: Element): ElementRect {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, width: r.width, height: r.height };
}

// =====================================================================
//  ElementPicker — "inspect mode"
// =====================================================================
export interface PickResult {
  selector: string;
  label: string;
  rect: ElementRect;
  element: Element;
}

export interface PickerOptions {
  /** Hint shown to the user inside the bottom pill. */
  hintText?: string;
  /** Cancel button label. */
  cancelText?: string;
  /** Scroll-mode toggle label (inactive state — "tap to scroll the page"). */
  scrollText?: string;
  /** Scroll-mode toggle label (active state — "tap to resume picking"). */
  scrollActiveText?: string;
  /** Text direction of the bottom pill — RTL for Hebrew, LTR for English. */
  dir?: 'rtl' | 'ltr';
  /** Accent color for the highlight ring. */
  accent?: string;
}

export class ElementPicker {
  private overlay: HTMLDivElement | null = null;
  private ring: HTMLDivElement | null = null;
  private tag: HTMLDivElement | null = null;
  private hintEl: HTMLDivElement | null = null;
  private scrollToggleBtn: HTMLButtonElement | null = null;
  private last: Element | null = null;
  /** The element the ring is currently locked to — same source for capture. */
  private locked: Element | null = null;
  private onPick?: (r: PickResult) => void;
  private onCancel?: () => void;
  private opts: Required<PickerOptions>;
  private moveScheduled = false;
  private pendingPoint: { x: number; y: number } | null = null;
  private scrollMode = false;

  constructor(options: PickerOptions = {}) {
    this.opts = {
      hintText: options.hintText ?? 'הקש על האלמנט הפגום',
      cancelText: options.cancelText ?? 'ביטול',
      scrollText: options.scrollText ?? 'גלול',
      scrollActiveText: options.scrollActiveText ?? 'בחר',
      dir: options.dir ?? 'rtl',
      accent: options.accent ?? '#f5c542', // ORCA gold
    };
  }


  get active(): boolean {
    return !!this.overlay;
  }

  start(onPick: (r: PickResult) => void, onCancel?: () => void): void {
    if (this.overlay) return;
    this.onPick = onPick;
    this.onCancel = onCancel;
    this.build();
    document.addEventListener('keydown', this.onKeyDown, true);
  }

  stop(): void {
    document.removeEventListener('keydown', this.onKeyDown, true);
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
      this.ring = null;
      this.tag = null;
      this.hintEl = null;
      this.scrollToggleBtn = null;
      this.last = null;
      this.locked = null;
    }
  }

  // -- internals ------------------------------------------------------
  private build() {
    const o = document.createElement('div');
    o.setAttribute(OVERLAY_ATTR, 'root');
    Object.assign(o.style, {
      position: 'fixed',
      inset: '0',
      zIndex: String(Z),
      cursor: 'crosshair',
      touchAction: 'none',
      background: 'rgba(6,10,18,0.28)',
      backdropFilter: 'saturate(1.05)',
    } as CSSStyleDeclaration);

    // highlight ring — on mobile we skip the giant 2000px box-shadow
    // (it triggers full-viewport repaints on every pointermove and is the
    // main cause of laggy element picking). Dimming is provided by the
    // overlay's own background instead.
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const ring = document.createElement('div');
    ring.setAttribute(OVERLAY_ATTR, 'ring');
    Object.assign(ring.style, {
      position: 'fixed',
      pointerEvents: 'none',
      border: `2px solid ${this.opts.accent}`,
      borderRadius: '6px',
      boxShadow: isMobile
        ? `0 0 12px ${this.opts.accent}88`
        : `0 0 0 2000px rgba(6,10,18,0.45), 0 0 18px ${this.opts.accent}55`,
      transition: 'left 40ms linear, top 40ms linear, width 40ms linear, height 40ms linear',
      willChange: 'left, top, width, height',
      left: '0px',
      top: '0px',
      width: '0px',
      height: '0px',
      opacity: '0',
    } as CSSStyleDeclaration);


    // floating element tag/label near the cursor
    const tag = document.createElement('div');
    tag.setAttribute(OVERLAY_ATTR, 'tag');
    Object.assign(tag.style, {
      position: 'fixed',
      pointerEvents: 'none',
      font: '600 11px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace',
      color: '#06121f',
      background: this.opts.accent,
      padding: '3px 8px',
      borderRadius: '6px',
      whiteSpace: 'nowrap',
      transform: 'translateY(-130%)',
      opacity: '0',
      direction: 'ltr',
      maxWidth: '60vw',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    } as CSSStyleDeclaration);

    // hint pill + scroll toggle + cancel
    const hint = document.createElement('div');
    hint.setAttribute(OVERLAY_ATTR, 'hint');
    Object.assign(hint.style, {
      position: 'fixed',
      left: '50%',
      bottom: 'max(20px, env(safe-area-inset-bottom))',
      transform: 'translateX(-50%)',
      display: 'flex',
      gap: '10px',
      alignItems: 'center',
      padding: '10px 14px',
      borderRadius: '999px',
      background: 'rgba(10,16,26,0.92)',
      border: '1px solid rgba(245,197,66,0.35)',
      color: '#e8edf5',
      font: '600 14px/1 Heebo,system-ui,sans-serif',
      direction: this.opts.dir,
      boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
    } as CSSStyleDeclaration);

    const label = document.createElement('span');
    label.textContent = this.opts.hintText;

    // scroll-mode toggle — lets the user scroll the page on mobile to reach
    // off-screen elements, then tap again to lock-and-pick.
    const scrollBtn = document.createElement('button');
    scrollBtn.setAttribute(OVERLAY_ATTR, 'scroll-toggle');
    scrollBtn.type = 'button';
    scrollBtn.textContent = this.opts.scrollText;
    Object.assign(scrollBtn.style, {
      cursor: 'pointer',
      border: '1px solid rgba(255,255,255,0.18)',
      background: 'transparent',
      color: '#9fb0c5',
      borderRadius: '999px',
      padding: '5px 12px',
      font: '600 13px/1 Heebo,system-ui,sans-serif',
    } as CSSStyleDeclaration);
    scrollBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.setScrollMode(!this.scrollMode);
    });

    const cancel = document.createElement('button');
    cancel.setAttribute(OVERLAY_ATTR, 'cancel');
    cancel.type = 'button';
    cancel.textContent = this.opts.cancelText;
    Object.assign(cancel.style, {
      cursor: 'pointer',
      border: '1px solid rgba(255,255,255,0.18)',
      background: 'transparent',
      color: '#9fb0c5',
      borderRadius: '999px',
      padding: '5px 12px',
      font: '600 13px/1 Heebo,system-ui,sans-serif',
    } as CSSStyleDeclaration);
    cancel.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.stop();
      this.onCancel?.();
    });

    hint.append(label, scrollBtn, cancel);
    o.append(ring, tag, hint);
    document.body.appendChild(o);

    this.overlay = o;
    this.ring = ring;
    this.tag = tag;
    this.hintEl = hint;
    this.scrollToggleBtn = scrollBtn;

    o.addEventListener('pointermove', this.onMove);
    o.addEventListener('pointerdown', this.onDown);
  }

  private setScrollMode(on: boolean) {
    this.scrollMode = on;
    if (!this.overlay || !this.scrollToggleBtn) return;
    if (on) {
      // Release pointer interception so the page can scroll under the overlay.
      this.overlay.style.touchAction = 'auto';
      this.overlay.style.pointerEvents = 'none';
      this.scrollToggleBtn.textContent = this.opts.scrollActiveText;
      this.scrollToggleBtn.style.background = this.opts.accent;
      this.scrollToggleBtn.style.color = '#06121f';
      // Hint pill stays interactive (it's a child).
      if (this.hintEl) this.hintEl.style.pointerEvents = 'auto';
    } else {
      this.overlay.style.touchAction = 'none';
      this.overlay.style.pointerEvents = 'auto';
      this.scrollToggleBtn.textContent = this.opts.scrollText;
      this.scrollToggleBtn.style.background = 'transparent';
      this.scrollToggleBtn.style.color = '#9fb0c5';
    }
  }

  /** elementFromPoint, ignoring our own overlay. */
  private elementUnder(x: number, y: number): Element | null {
    if (!this.overlay) return null;
    const prev = this.overlay.style.pointerEvents;
    this.overlay.style.pointerEvents = 'none';
    let el = document.elementFromPoint(x, y);
    this.overlay.style.pointerEvents = prev || 'auto';
    if (el && (el as HTMLElement).closest?.(`[${OVERLAY_ATTR}]`)) el = null;
    return el;
  }

  private onMove = (e: PointerEvent) => {
    this.pendingPoint = { x: e.clientX, y: e.clientY };
    if (this.moveScheduled) return;
    this.moveScheduled = true;
    requestAnimationFrame(() => {
      this.moveScheduled = false;
      const p = this.pendingPoint;
      if (!p) return;
      const el = this.elementUnder(p.x, p.y);
      if (!el || !this.ring || !this.tag) return;
      this.last = el;
      const r = el.getBoundingClientRect();
      Object.assign(this.ring.style, {
        left: `${r.left}px`,
        top: `${r.top}px`,
        width: `${r.width}px`,
        height: `${r.height}px`,
        opacity: '1',
      });
      this.tag.textContent = `${el.tagName.toLowerCase()} · ${Math.round(
        r.width
      )}×${Math.round(r.height)}`;
      const tagTop = Math.max(28, r.top);
      Object.assign(this.tag.style, {
        left: `${r.left}px`,
        top: `${tagTop}px`,
        opacity: '1',
      });
    });
  };

  private onDown = (e: PointerEvent) => {
    // let clicks on our own hint/cancel pass through to their handlers
    if ((e.target as HTMLElement)?.closest?.(`[${OVERLAY_ATTR}="hint"]`)) return;
    if (this.scrollMode) return; // page is scrolling; ignore
    e.preventDefault();
    e.stopPropagation();
    // Capture-source = the element the ring was last drawn around (touch has
    // no hover; the move handler ran on pointerdown's coalesced move events).
    // Fall back to a fresh hit-test only if we somehow have nothing locked.
    const el = this.last || this.elementUnder(e.clientX, e.clientY);
    if (!el) return;
    this.locked = el;
    const rect = rectOf(el); // measurements locked BEFORE any mutation
    const result: PickResult = {
      selector: buildSelector(el),
      label: buildLabel(el),
      rect,
      element: el,
    };
    this.stop();
    this.onPick?.(result);
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      this.stop();
      this.onCancel?.();
    }
  };
}


// =====================================================================
//  Screenshot
// =====================================================================
export interface Shot {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
}

/** Capture the current viewport (used only when the user explicitly chooses
 *  "צלם מסך מלא"). Default flow uses {@link captureElementRegion} instead. */
export async function captureViewport(
  highlight?: ElementRect | null,
  accent = '#f5c542'
): Promise<Shot | null> {
  if (typeof window === 'undefined') return null;
  let html2canvas: typeof import('html2canvas').default;
  try {
    html2canvas = (await import('html2canvas')).default;
  } catch {
    return null;
  }

  try {
    const isMobile = window.innerWidth < 768;
    // Cap scale on mobile to avoid OOM on long pages.
    const scale = isMobile ? 1.5 : Math.min(2, window.devicePixelRatio || 1);
    const canvas = await html2canvas(document.body, {
      backgroundColor: '#0b111b',
      scale,
      useCORS: true,
      logging: false,
      x: window.scrollX,
      y: window.scrollY,
      width: window.innerWidth,
      height: window.innerHeight,
      windowWidth: document.documentElement.scrollWidth,
      windowHeight: document.documentElement.scrollHeight,
      ignoreElements: (el) => el.hasAttribute(OVERLAY_ATTR),
    });

    if (highlight && highlight.width > 0 && highlight.height > 0) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.save();
        ctx.strokeStyle = accent;
        ctx.lineWidth = 3 * scale;
        ctx.shadowColor = accent;
        ctx.shadowBlur = 12 * scale;
        const pad = 4 * scale;
        ctx.strokeRect(
          highlight.x * scale - pad,
          highlight.y * scale - pad,
          highlight.width * scale + pad * 2,
          highlight.height * scale + pad * 2
        );
        ctx.restore();
      }
    }

    const dataUrl = canvas.toDataURL('image/png');
    const blob: Blob = await new Promise((res) =>
      canvas.toBlob((b) => res(b as Blob), 'image/png', 0.92)
    );
    return { blob, dataUrl, width: canvas.width, height: canvas.height };
  } catch {
    return null;
  }
}

/** Walk up until we find an ancestor whose computed background is opaque.
 *  Falls back to the original element. Used so element-region captures
 *  don't look like floating text on transparent. */
function nearestOpaqueAncestor(el: Element): Element {
  let node: Element | null = el;
  while (node && node !== document.body) {
    const cs = getComputedStyle(node);
    const bg = cs.backgroundColor;
    if (bg && bg !== 'transparent' && !/rgba\([^)]+,\s*0(\.0+)?\s*\)/.test(bg)) {
      return node;
    }
    node = node.parentElement;
  }
  return el;
}

/** Capture the selected element + small padding only. Smaller render = no OOM
 *  on mobile, and no full-page relayout = the image is guaranteed to be the
 *  element the user picked. */
export async function captureElementRegion(
  el: Element,
  opts: { padding?: number; accent?: string } = {}
): Promise<Shot | null> {
  if (typeof window === 'undefined' || !el) return null;
  let html2canvas: typeof import('html2canvas').default;
  try {
    html2canvas = (await import('html2canvas')).default;
  } catch {
    return null;
  }

  try {
    const padding = opts.padding ?? 28;
    // Scroll the element fully into view, then re-measure after a frame.
    try { (el as HTMLElement).scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' as ScrollBehavior }); } catch { (el as HTMLElement).scrollIntoView(); }
    await new Promise((r) => requestAnimationFrame(() => r(null)));

    // Render the nearest opaque ancestor so the image has a real background.
    const target = nearestOpaqueAncestor(el) as HTMLElement;
    const rect = target.getBoundingClientRect();

    const isMobile = window.innerWidth < 768;
    const scale = Math.min(isMobile ? 1.75 : 2, window.devicePixelRatio || 1);

    const canvas = await html2canvas(target, {
      backgroundColor: '#0b111b',
      scale,
      useCORS: true,
      logging: false,
      ignoreElements: (n) => n.hasAttribute(OVERLAY_ATTR),
    });

    // Pad: render onto a slightly larger canvas with theme background.
    const padPx = Math.round(padding * scale);
    const outW = canvas.width + padPx * 2;
    const outH = canvas.height + padPx * 2;
    const out = document.createElement('canvas');
    out.width = outW;
    out.height = outH;
    const ctx = out.getContext('2d')!;
    ctx.fillStyle = '#0b111b';
    ctx.fillRect(0, 0, outW, outH);
    ctx.drawImage(canvas, padPx, padPx);

    // Subtle gold frame around the captured element, so the user sees what was selected.
    const accent = opts.accent ?? '#f5c542';
    ctx.save();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2 * scale;
    ctx.shadowColor = accent;
    ctx.shadowBlur = 10 * scale;
    ctx.strokeRect(padPx - 1, padPx - 1, canvas.width + 2, canvas.height + 2);
    ctx.restore();
    void rect; // measurements were taken for future inspection if needed

    const dataUrl = out.toDataURL('image/png');
    const blob: Blob = await new Promise((res) =>
      out.toBlob((b) => res(b as Blob), 'image/png', 0.92)
    );
    return { blob, dataUrl, width: outW, height: outH };
  } catch {
    return null;
  }
}


// =====================================================================
//  Annotation — burn drawings onto a base image
// =====================================================================
export type AnnoTool = 'rect' | 'arrow' | 'pen';

export interface AnnoStroke {
  tool: AnnoTool;
  color: string;
  /** normalized 0..1 points relative to the image box */
  points: { x: number; y: number }[];
}

/** Compose strokes (normalized coords) onto the base image -> PNG Blob. */
export async function composeAnnotatedImage(
  baseDataUrl: string,
  strokes: AnnoStroke[]
): Promise<{ blob: Blob; width: number; height: number }> {
  const img = await loadImage(baseDataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);

  const W = canvas.width;
  const H = canvas.height;
  const lw = Math.max(3, Math.round(W / 350));

  for (const s of strokes) {
    ctx.save();
    ctx.strokeStyle = s.color;
    ctx.fillStyle = s.color;
    ctx.lineWidth = lw;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = lw;

    const pts = s.points.map((p) => ({ x: p.x * W, y: p.y * H }));
    if (s.tool === 'rect' && pts.length >= 2) {
      const a = pts[0];
      const b = pts[pts.length - 1];
      ctx.strokeRect(
        Math.min(a.x, b.x),
        Math.min(a.y, b.y),
        Math.abs(b.x - a.x),
        Math.abs(b.y - a.y)
      );
    } else if (s.tool === 'arrow' && pts.length >= 2) {
      const a = pts[0];
      const b = pts[pts.length - 1];
      drawArrow(ctx, a.x, a.y, b.x, b.y, lw);
    } else if (s.tool === 'pen' && pts.length >= 2) {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
    }
    ctx.restore();
  }

  const blob: Blob = await new Promise((res) =>
    canvas.toBlob((b) => res(b as Blob), 'image/png', 0.92)
  );
  return { blob, width: W, height: H };
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  lw: number
) {
  const head = Math.max(12, lw * 3.5);
  const ang = Math.atan2(y2 - y1, x2 - x1);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - head * Math.cos(ang - Math.PI / 6),
    y2 - head * Math.sin(ang - Math.PI / 6)
  );
  ctx.lineTo(
    x2 - head * Math.cos(ang + Math.PI / 6),
    y2 - head * Math.sin(ang + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
}

/** Down-scale + compress an arbitrary user-uploaded image before upload. */
export async function normalizeUpload(
  file: File,
  maxDim = 2000,
  quality = 0.85
): Promise<{ blob: Blob; width: number; height: number }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    let { naturalWidth: w, naturalHeight: h } = img;
    const scale = Math.min(1, maxDim / Math.max(w, h));
    w = Math.round(w * scale);
    h = Math.round(h * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
    const isPng = file.type.includes('png');
    const blob: Blob = await new Promise((res) =>
      canvas.toBlob(
        (b) => res(b as Blob),
        isPng ? 'image/png' : 'image/jpeg',
        quality
      )
    );
    return { blob, width: w, height: h };
  } finally {
    URL.revokeObjectURL(url);
  }
}
