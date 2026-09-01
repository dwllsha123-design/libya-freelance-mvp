'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { usePaymentsApi, type PaymentRecord } from '@/hooks/use-payments';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'قيد الانتظار',
  PROCESSING: 'جاري المعالجة',
  SUCCEEDED: 'مكتمل',
  FAILED: 'فشل',
  CANCELLED: 'ملغى',
  REFUNDED: 'مُسترد',
};

function PaymentReturnContent() {
  const searchParams = useSearchParams();
  const paymentId = searchParams.get('paymentId');
  const { user, isLoading: authLoading } = useAuth();
  const paymentsApi = usePaymentsApi();
  const [payment, setPayment] = useState<PaymentRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pollDone, setPollDone] = useState(false);

  const shouldPoll = Boolean(user && paymentId);
  const isLoading = authLoading || (shouldPoll && !pollDone && !error);

  useEffect(() => {
    if (!shouldPoll) return;

    let cancelled = false;
    let attempts = 0;

    async function poll() {
      try {
        const data = await paymentsApi.getPayment(paymentId!);
        if (cancelled) return;
        setPayment(data);
        if ((data.status === 'PROCESSING' || data.status === 'PENDING') && attempts < 8) {
          attempts += 1;
          window.setTimeout(() => void poll(), 2000);
          return;
        }
        setPollDone(true);
      } catch {
        if (!cancelled) {
          setError('تعذر التحقق من حالة الدفع');
          setPollDone(true);
        }
      }
    }

    void poll();

    return () => {
      cancelled = true;
    };
  }, [shouldPoll, paymentId, paymentsApi]);

  if (isLoading) {
    return <div className="p-8 text-center">جاري التحقق من الدفع...</div>;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg p-8 text-center">
        <p className="mb-4">يجب تسجيل الدخول لمتابعة عملية الدفع.</p>
        <Link href="/login" className="text-primary underline">
          تسجيل الدخول
        </Link>
      </div>
    );
  }

  if (!paymentId) {
    return (
      <div className="mx-auto max-w-lg p-8 text-center">
        <p>لم يُرسل معرّف الدفع.</p>
        <Link href="/dashboard/escrow" className="mt-4 inline-block text-primary underline">
          سجل الضمان
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg p-8 text-center">
        <p className="text-red-600">{error}</p>
        <Link href="/dashboard/escrow" className="mt-4 inline-block text-primary underline">
          العودة لسجل الضمان
        </Link>
      </div>
    );
  }

  const succeeded = payment?.status === 'SUCCEEDED';

  return (
    <div className="mx-auto max-w-lg p-8">
      <h1 className="text-xl font-bold text-on-surface">نتيجة الدفع</h1>
      {payment ? (
        <div className="mt-4 space-y-3 rounded-xl border bg-white p-5">
          <p>
            <span className="text-slate-500">الحالة: </span>
            <strong>{STATUS_LABELS[payment.status] ?? payment.status}</strong>
          </p>
          <p>
            <span className="text-slate-500">المبلغ: </span>
            {payment.amount} {payment.currency}
          </p>
          {payment.failureMessage ? (
            <p className="text-sm text-red-600">{payment.failureMessage}</p>
          ) : null}
          {succeeded ? (
            <p className="text-sm text-primary">
              تم تأكيد الدفع. يمكنك الآن إكمال قبول العرض أو متابعة المشروع.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/dashboard/escrow" className="rounded-lg border px-4 py-2 text-sm">
          سجل الضمان
        </Link>
        <Link href="/dashboard/projects" className="rounded-lg bg-primary px-4 py-2 text-sm text-white">
          مشاريعي
        </Link>
      </div>
    </div>
  );
}

export default function PaymentReturnPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">جاري التحميل...</div>}>
      <PaymentReturnContent />
    </Suspense>
  );
}
