'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import type { PublicProfile } from '@/lib/api';
import { FreelancerCard } from '@/components/freelancers/freelancer-card';

const AUTO_ADVANCE_MS = 6000;

function usePageSize() {
  const [pageSize, setPageSize] = useState(1);

  useEffect(() => {
    function update() {
      setPageSize(window.innerWidth >= 1024 ? 3 : window.innerWidth >= 640 ? 2 : 1);
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return pageSize;
}

export function FreelancerCarousel({ freelancers }: { freelancers: PublicProfile[] }) {
  const t = useTranslations('home');
  const pageSize = usePageSize();
  const [page, setPage] = useState(0);
  const [paused, setPaused] = useState(false);

  const totalPages = Math.max(1, Math.ceil(freelancers.length / pageSize));
  const currentPage = Math.min(page, totalPages - 1);
  const visible = freelancers.slice(
    currentPage * pageSize,
    currentPage * pageSize + pageSize,
  );

  const goNext = useCallback(() => {
    setPage((current) => (Math.min(current, totalPages - 1) + 1) % totalPages);
  }, [totalPages]);

  const goPrev = useCallback(() => {
    setPage((current) => (Math.min(current, totalPages - 1) - 1 + totalPages) % totalPages);
  }, [totalPages]);

  useEffect(() => {
    if (paused || freelancers.length <= pageSize) return;
    const timer = window.setInterval(goNext, AUTO_ADVANCE_MS);
    return () => window.clearInterval(timer);
  }, [paused, goNext, freelancers.length, pageSize]);

  if (freelancers.length === 0) return null;

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((freelancer) => (
          <FreelancerCard key={freelancer.username} freelancer={freelancer} variant="carousel" />
        ))}
      </div>

      {totalPages > 1 ? (
        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={goPrev}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant/50 bg-surface text-on-surface transition hover:border-primary hover:text-primary"
            aria-label={t('carouselPrevious')}
          >
            →
          </button>

          <div className="flex gap-2">
            {Array.from({ length: totalPages }).map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setPage(index)}
                className={`h-2.5 rounded-full transition ${
                  index === currentPage ? 'w-8 bg-primary' : 'w-2.5 bg-outline-variant/60 hover:bg-primary/50'
                }`}
                aria-label={t('carouselPage', { page: index + 1 })}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={goNext}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant/50 bg-surface text-on-surface transition hover:border-primary hover:text-primary"
            aria-label={t('carouselNext')}
          >
            ←
          </button>
        </div>
      ) : null}
    </div>
  );
}
