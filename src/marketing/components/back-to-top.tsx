import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import { scroll, engine } from '../lib/scroll-store'

// easeInOutCubic — slow start, quick middle, soft landing at the top.
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/**
 * Floating "back to top" pill. Fades in once the page is scrolled a little, and
 * relies on Lenis's anchor handling (anchors: true) to glide smoothly to #hero.
 * Visibility is driven from the shared scroll store in a rAF loop — it touches
 * React state at most twice per full scroll.
 */
export function BackToTop() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    let raf = 0
    let last = false
    const loop = () => {
      const visible = scroll.progress > 0.08
      if (visible !== last) {
        last = visible
        setShow(visible)
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  const toTop = (e: React.MouseEvent) => {
    if (engine.lenis) {
      e.preventDefault()
      engine.lenis.scrollTo(0, { duration: 1.5, easing: easeInOutCubic })
    }
    // else: fall through to the native #hero anchor.
  }

  return (
    <a
      href="#hero"
      onClick={toTop}
      aria-label="Back to top"
      className={`fixed right-6 bottom-6 z-40 hidden h-12 w-12 items-center justify-center rounded-full bg-indigo text-white shadow-[0_10px_28px_-8px_rgba(124,58,237,0.55)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_34px_-8px_rgba(124,58,237,0.65)] lg:flex ${
        show ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'
      }`}
    >
      <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
    </a>
  )
}
