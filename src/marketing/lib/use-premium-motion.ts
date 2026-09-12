import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import type { Tier } from './device-tier'

gsap.registerPlugin(ScrollTrigger, SplitText)

/**
 * Magnetic pull toward the cursor.
 *
 * The element eases toward the pointer while hovered and springs back on
 * leave, via gsap.quickTo (a pre-built interpolator — no per-move tween
 * allocation). Disabled on coarse pointers, where there is no hover. The
 * element owns its transform here, so its resting transform must be identity.
 */
export function useMagnetic<T extends HTMLElement>(strength = 0.35) {
  const ref = useRef<T>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(pointer: coarse)').matches) return

    const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' })
    const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' })

    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      xTo((e.clientX - (r.left + r.width / 2)) * strength)
      yTo((e.clientY - (r.top + r.height / 2)) * strength)
    }
    const leave = () => {
      xTo(0)
      yTo(0)
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', leave)
    return () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerleave', leave)
    }
  }, [strength])
  return ref
}

/**
 * Premium reveal choreography.
 *
 * Three behaviours, all scroll-triggered, all opt-in via data-attributes so
 * nothing hidden here can ever leave the page blank if the script fails:
 *
 *   [data-animate="title"]  — SplitText into lines+words; each word rises out
 *                             of a clip mask with a staggered overshoot. The
 *                             single highest-impact upgrade: a headline that
 *                             *resolves* instead of fading reads as bespoke.
 *   [data-reveal]           — blocks fade + lift (kept from before).
 *   [data-count]            — the number tallies from 0 to its value on entry,
 *                             preserving prefix/suffix (+, R, ×, $, %).
 */
export function usePremiumMotion(tier: Tier, ready: boolean) {
  useEffect(() => {
    if (!ready || tier === 'none') return

    const ctx = gsap.context(() => {
      // ── Titles ──────────────────────────────────────────────────────
      // autoSplit re-splits on width changes (font reflow, device rotation,
      // a narrow mount) so a headline never sticks at a stale line breakdown —
      // e.g. one word per line because it was measured while the container was
      // momentarily narrow. onSplit re-arms the reveal for each fresh split.
      const titles = gsap.utils.toArray<HTMLElement>('[data-animate="title"]')
      titles.forEach((el) => {
        SplitText.create(el, {
          type: 'lines,words',
          linesClass: 'split-line',
          autoSplit: true,
          onSplit: (self) => {
            gsap.set(self.words, { yPercent: 118, opacity: 0 })
            return gsap.to(self.words, {
              yPercent: 0,
              opacity: 1,
              duration: 0.35,
              ease: 'power4.out',
              stagger: 0.03,
              scrollTrigger: { trigger: el, start: 'top 94%', once: true },
            })
          },
        })
      })

      // ── Side entrances ──────────────────────────────────────────────
      // A whole column flies in from its side (data-side="left"|"right") as
      // the section scrolls into view. overflow-x:clip on the root keeps the
      // off-screen offset from ever producing a horizontal scrollbar.
      const sides = gsap.utils.toArray<HTMLElement>('[data-side]')
      sides.forEach((el) => {
        const dir = el.dataset.side === 'right' ? 1 : -1
        gsap.set(el, { opacity: 0, x: 72 * dir })
        gsap.to(el, {
          opacity: 1,
          x: 0,
          duration: 0.75,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 82%', once: true },
        })
      })

      // ── Blocks ──────────────────────────────────────────────────────
      const blocks = gsap.utils.toArray<HTMLElement>('[data-reveal]')
      gsap.set(blocks, { opacity: 0, y: 18 })
      blocks.forEach((el) => {
        gsap.to(el, {
          opacity: 1,
          y: 0,
          duration: 0.2,
          ease: 'expo.out',
          scrollTrigger: { trigger: el, start: 'top 98%', once: true },
        })
      })

      // ── Count-ups ───────────────────────────────────────────────────
      const counters = gsap.utils.toArray<HTMLElement>('[data-count]')
      counters.forEach((el) => {
        const to = parseFloat(el.dataset.count || '0')
        const decimals = parseInt(el.dataset.decimals || '0', 10)
        const prefix = el.dataset.prefix || ''
        const suffix = el.dataset.suffix || ''
        // Thousands separators only when the value is large and undecimal.
        const group = el.dataset.group === 'true'
        const proxy = { v: 0 }
        const render = () => {
          const n = group
            ? proxy.v.toLocaleString('en-US', { maximumFractionDigits: decimals })
            : proxy.v.toFixed(decimals)
          el.textContent = `${prefix}${n}${suffix}`
        }
        render()
        gsap.to(proxy, {
          v: to,
          duration: 1.6,
          ease: 'power2.out',
          onUpdate: render,
          scrollTrigger: { trigger: el, start: 'top 90%', once: true },
        })
      })
    })

    ScrollTrigger.refresh()
    return () => ctx.revert()
  }, [tier, ready])
}
