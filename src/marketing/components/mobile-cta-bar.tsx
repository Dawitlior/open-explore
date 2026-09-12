import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

/* ============================================================================
   MOBILE CTA BAR — a thumb-zone action bar pinned to the bottom on phones only.
   Slides up once you've scrolled past the hero and tucks away near the footer so
   it never covers the footer's own links. Hidden on desktop (lg+).
   ========================================================================== */

export function MobileCtaBar() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      const nearBottom = window.innerHeight + y > document.documentElement.scrollHeight - 340
      setShow(y > 460 && !nearBottom)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 lg:hidden transition-transform duration-300 ease-out ${
        show ? 'translate-y-0' : 'translate-y-[130%]'
      }`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-3 mb-3 flex items-center gap-2 rounded-2xl border border-line bg-surface/95 p-2 shadow-[0_-6px_28px_-10px_rgba(15,17,22,0.25)] backdrop-blur">
        <Link
          to="/login"
          className="flex min-h-[48px] flex-1 items-center justify-center rounded-xl border border-line bg-surface px-4 text-[15px] font-semibold text-ink"
        >
          Log in
        </Link>
        <Link
          to="/signup"
          className="flex min-h-[48px] flex-[1.5] items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#6d28d9] px-4 text-[15px] font-semibold text-white shadow-[0_8px_20px_-8px_rgba(124,58,237,0.6)]"
        >
          Start free →
        </Link>
      </div>
    </div>
  )
}
