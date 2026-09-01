'use client';

interface RatingStarsProps {
  value: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  size?: 'sm' | 'md';
}

export function RatingStars({
  value,
  onChange,
  readOnly = false,
  size = 'md',
}: RatingStarsProps) {
  const starClass = size === 'sm' ? 'text-lg' : 'text-2xl';

  return (
    <div className="flex gap-1" role="radiogroup" aria-label="التقييم">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          aria-label={`${star} نجوم`}
          aria-checked={value === star}
          role="radio"
          onClick={() => onChange?.(star)}
          className={`${starClass} ${readOnly ? 'cursor-default' : 'cursor-pointer'} ${
            star <= value ? 'text-amber-400' : 'text-slate-300'
          }`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
