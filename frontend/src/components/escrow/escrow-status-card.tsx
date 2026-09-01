import { ESCROW_STATUS_LABELS, type EscrowRecord } from '@/hooks/use-escrow';
import { formatCurrency } from '@/lib/currency';

const STATUS_STYLES: Record<EscrowRecord['status'], string> = {
  PENDING_FUNDING: 'bg-amber-50 text-amber-800 border-amber-200',
  FUNDED: 'bg-blue-50 text-blue-800 border-blue-200',
  RELEASED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  REFUNDED: 'bg-slate-100 text-slate-700 border-slate-200',
  DISPUTED: 'bg-red-50 text-red-800 border-red-200',
};

export function EscrowStatusCard({ escrow }: { escrow: EscrowRecord }) {
  return (
    <div className={`rounded-xl border p-4 ${STATUS_STYLES[escrow.status]}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">نظام الضمان</p>
        <span className="rounded-full bg-white/60 px-2 py-0.5 text-xs font-medium">
          {ESCROW_STATUS_LABELS[escrow.status]}
        </span>
      </div>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs opacity-80">المبلغ المحجوز</dt>
          <dd className="font-semibold">{formatCurrency(escrow.amount, escrow.currency)}</dd>
        </div>
        <div>
          <dt className="text-xs opacity-80">عمولة المنصة</dt>
          <dd>{formatCurrency(escrow.platformFee, escrow.currency)}</dd>
        </div>
        <div>
          <dt className="text-xs opacity-80">صافي المستقل</dt>
          <dd>{formatCurrency(escrow.freelancerPayout, escrow.currency)}</dd>
        </div>
      </dl>
      {escrow.dispute ? (
        <p className="mt-3 text-xs">نزاع مفتوح: {escrow.dispute.reason}</p>
      ) : null}
    </div>
  );
}
