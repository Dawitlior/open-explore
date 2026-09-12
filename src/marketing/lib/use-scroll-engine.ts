import { useEffect } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { scroll, pointer, engine } from './scroll-store'
import type { Tier } from './device-tier'
import { tierHasParallax } from './device-tier'

gsap.registerPlugin(ScrollTrigger)

/**
 * Boots the inertial scroll engine and wires it to GSAP's ticker.
 *
 * The critical detail: Lenis and ScrollTrigger must share ONE clock. If Lenis
 * runs its own rAF while ScrollTrigger runs on gsap.ticker, scroll position is
 * read one frame stale and the 3D camera visibly lags the DOM. So Lenis is
 * driven FROM the gsap ticker, and lagSmoothing is killed — GSAP's default
 * catch-up behaviour would teleport the camera after a dropped frame.
 */
export function useScrollEngine(tier: Tier) {
  useEffect(() => {
    if (tier === 'none') {
      // Reduced motion / no WebGL: native scrolling, no smoothing, no lerp.
      // Progress is still tracked so the nav rail stays accurate.
      const onScroll = () => {
        const max = document.documentElement.scrollHeight - window.innerHeight
        scroll.progress = max > 0 ? window.scrollY / max : 0
      }
      onScroll()
      window.addEventListener('scroll', onScroll, { passive: true })
      return () => window.removeEventListener('scroll', onScroll)
    }

    const lenis = new Lenis({
      duration: 1.2,
      // easeOutExpo — fast in, long weighted glide out.
      easing: (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
      wheelMultiplier: 1,
      touchMultiplier: 1.6,
      lerp: 0.09,
      // Smooth-scroll all in-page hash links (nav, CTAs, back-to-top) instead
      // of letting the browser jump — which would fight Lenis's virtual scroll.
      anchors: true,
    })

    engine.lenis = lenis
    lenis.on('scroll', ScrollTrigger.update)

    const tick = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)

    const st = ScrollTrigger.create({
      trigger: document.documentElement,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      onUpdate: (self) => {
        scroll.progress = self.progress
        scroll.velocity = self.getVelocity() / 1000
      },
    })

    return () => {
      st.kill()
      gsap.ticker.remove(tick)
      lenis.destroy()
      engine.lenis = null
    }
  }, [tier])

  /** Cursor tracking for 3D parallax tilt. Passive, and pointer-type aware. */
  useEffect(() => {
    if (!tierHasParallax(tier)) return

    const onMove = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1
      pointer.y = -((e.clientY / window.innerHeight) * 2 - 1)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [tier])
}

/**
 * Scroll-linked reveal for every [data-reveal] node.
 *
 * The hidden state is set HERE, not in CSS — see globals.css. If this hook
 * never runs, the page is simply already visible, which is the correct
 * degradation for a content site.
 *
 * One trigger per element rather than ScrollTrigger.batch(): batch only fires
 * onEnter on an actual crossing, so anything already in the viewport at load
 * (the entire hero) stays invisible. There are ~35 of these, not ~200, so the
 * individual triggers cost nothing worth optimising away.
 */
export function useRevealAnimations(tier: Tier, ready: boolean) {
  useEffect(() => {
    if (!ready || tier === 'none') return

    const els = gsap.utils.toArray<HTMLElement>('[data-reveal]')
    if (!els.length) return

    const ctx = gsap.context(() => {
      gsap.set(els, { opacity: 0, y: 26 })
      els.forEach((el) => {
        gsap.to(el, {
          opacity: 1,
          y: 0,
          duration: 1.05,
          ease: 'expo.out',
          scrollTrigger: { trigger: el, start: 'top 92%', once: true },
        })
      })
    })

    ScrollTrigger.refresh()

    return () => {
      ctx.revert()
      // revert() restores the pre-animation inline state, which is the hidden
      // one. Clear it so a re-mount never leaves content stranded at opacity 0.
      gsap.set(els, { clearProps: 'opacity,transform' })
    }
  }, [tier, ready])
}
