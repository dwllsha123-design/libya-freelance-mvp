import { ESCROW_CURRENCY } from '../escrow/escrow.constants.js';

export const AGREEMENT_CURRENCY = ESCROW_CURRENCY;

export const DEFAULT_REVISION_COUNT = 2;

export const DEFAULT_PAYMENT_TERMS =
  'الدفع يتم مباشرة بين صاحب المشروع والمستقل خارج ليبي فريلانس. ليبي فريلانس منصة إعلانية ووسيط تقني — لا تستلم أو تحتفظ بقيمة المشروع. قيمة الاتفاق المذكورة إعلامية فقط ولا تُحصَّل عبر المنصة.';

export const DEFAULT_CANCELLATION_TERMS =
  'يمكن إلغاء اتفاق المشروع بالتراضي قبل بدء التنفيذ. بعد بدء التنفيذ يُفضَّل الاتفاق كتابياً عبر مراسلات المنصة حول أي إلغاء أو تعديل.';

export const DEFAULT_DISPUTE_TERMS =
  'في حال الخلاف، تواصل الطرفان أولاً عبر مراسلة المنصة. يمكن للإدارة مراجعة النزاع وفق سياسات المنصة. المنصة لا تحتفظ بأموال المشروع ولا تضمن السداد أو التنفيذ.';


export const ACTIVE_AGREEMENT_STATUSES = [
  'PENDING_APPROVAL',
  'APPROVED',
  'PAYMENT_PENDING',
  'FUNDED',
  'ACTIVE',
  'DISPUTED',
] as const;
