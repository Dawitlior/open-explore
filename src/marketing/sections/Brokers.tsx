import { useMarketingUI } from '../UIContext';
import { useStrings } from '../i18n';
import { useReveal } from '../use-reveal';

/**
 * Brokers ribbon. Hidden when BROKERS_LIST is empty (per spec §6).
 * Until a real list is supplied, render the placeholder slot so the
 * data-placeholder outline is visible in dev — do NOT invent broker logos.
 */
const BROKERS_LIST: string[] = []; // «BROKERS_LIST» — populate before launch

export function MktBrokers() {
  const { lang } = useMarketingUI();
  const t = useStrings(lang).brokers;
  const ref = useReveal<HTMLElement>();

  return (
    <section id="platforms" ref={ref} className="mk-reveal py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <h2 className="text-center mk-display"
            style={{ fontSize: 'clamp(20px, 2.4vw, 28px)', color: 'var(--mk-muted)' }}>
          {t.title}
        </h2>

        {BROKERS_LIST.length === 0 ? (
          <div className="mt-6 flex justify-center">
            <span data-placeholder="true" className="text-xs">«BROKERS_LIST» — empty, ribbon hidden in production</span>
          </div>
        ) : (
          <div className="mt-8 overflow-hidden">
            <div className="flex gap-12 items-center justify-center flex-wrap opacity-70">
              {BROKERS_LIST.map((name) => (
                <span key={name} className="text-base font-semibold" style={{ color: 'var(--mk-muted)' }}>{name}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
