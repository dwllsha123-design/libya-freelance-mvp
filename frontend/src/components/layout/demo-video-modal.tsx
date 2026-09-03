'use client';

import { useLocale } from 'next-intl';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { DESIGN_GLOW_PATH } from '@/lib/branding';
import { useIsClient } from '@/hooks/use-is-client';

type DemoLang = 'ar' | 'en';

const copy: Record<
  DemoLang,
  {
    tag: string;
    title: string;
    sub: string;
    play: string;
    steps: string[];
    close: string;
  }
> = {
  ar: {
    tag: 'عرض توضيحي للمنصة',
    title: 'شاهد جولة قصيرة',
    sub: 'تعرّف على كيفية نشر مشروعك، استقبال العروض، والدفع الآمن خلال دقيقتين.',
    play: 'تشغيل الجولة',
    steps: ['أنشئ حسابك مجانًا', 'انشر أو تصفّح العروض', 'سلّم وادفع عبر الضمان'],
    close: 'إغلاق',
  },
  en: {
    tag: 'Platform demo',
    title: 'Watch a quick tour',
    sub: 'See how to post a project, receive proposals, and pay safely in under two minutes.',
    play: 'Play the tour',
    steps: ['Create your free account', 'Post or browse gigs', 'Deliver & pay via escrow'],
    close: 'Close',
  },
};

export function DemoVideoModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const locale = useLocale();
  const isClient = useIsClient();
  const [lang, setLang] = useState<DemoLang>(locale === 'en' ? 'en' : 'ar');
  const [playing, setPlaying] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setPlaying(false);
  }

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open || !isClient) return null;
  const t = copy[lang];

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-ink/60 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
        className="my-auto w-full max-w-2xl overflow-hidden rounded-3xl border border-line bg-cream shadow-[0_40px_100px_-30px_rgba(21,32,60,0.7)]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t.title}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line/70 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1 rounded-full border border-ember/25 bg-ember/10 px-3 py-1 text-xs font-medium text-ember-deep">
              ✦ {t.tag}
            </span>
            <h3 className="mt-2 font-display text-lg font-bold text-ink sm:text-xl">{t.title}</h3>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="flex overflow-hidden rounded-full border border-line text-xs font-semibold">
              {(['ar', 'en'] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  className={`px-3 py-1.5 transition-colors ${
                    lang === l ? 'bg-ink text-cream' : 'text-ink-soft hover:bg-cream-deep'
                  }`}
                >
                  {l === 'ar' ? 'العربية' : 'EN'}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid size-8 place-items-center rounded-full border border-line text-ink-soft transition-colors hover:bg-cream-deep"
              aria-label={t.close}
            >
              ✕
            </button>
          </div>
        </div>

        <div className="max-h-[min(80dvh,40rem)] overflow-y-auto p-5 sm:p-6">
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="group relative block aspect-video w-full overflow-hidden rounded-2xl bg-ink"
            aria-label={t.play}
          >
            <span
              className="absolute inset-0 bg-cover bg-center opacity-70 transition-transform duration-700 group-hover:scale-105"
              style={{ backgroundImage: `url(${DESIGN_GLOW_PATH})` }}
            />
            <span className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
            {!playing ? (
              <span className="absolute inset-0 grid place-items-center">
                <span className="grid size-16 place-items-center rounded-full bg-ember text-2xl text-white shadow-[0_12px_30px_-8px_rgba(239,77,26,0.9)] transition-transform group-hover:scale-110">
                  ▶
                </span>
              </span>
            ) : (
              <span className="absolute inset-0 grid place-items-center text-cream/90">
                <span className="animate-pulse font-display text-sm">…{t.play}</span>
              </span>
            )}
            <span className="absolute bottom-3 end-4 rounded-full bg-cream/90 px-3 py-1 text-xs font-semibold text-ink">
              2:14
            </span>
          </button>

          <p className="mt-5 text-sm leading-relaxed text-ink-soft">{t.sub}</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {t.steps.map((s, i) => (
              <div
                key={s}
                className="flex items-center gap-2 rounded-xl border border-line bg-cream-deep/40 px-3 py-2.5 text-xs font-medium text-ink"
              >
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-ember text-[10px] text-white">
                  {i + 1}
                </span>
                {s}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
