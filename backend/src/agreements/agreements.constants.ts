import { ESCROW_CURRENCY } from '../escrow/escrow.constants.js';

export const AGREEMENT_CURRENCY = ESCROW_CURRENCY;

export const DEFAULT_REVISION_COUNT = 2;

export const DEFAULT_PAYMENT_TERMS =
  'يتم حجز مبلغ المشروع في ضمان المنصة قبل بدء التنفيذ، ويُحرَّر صافي المستقل بعد إكمال العمل وموافقة العميل وفق سياسة الضمان.';

export const DEFAULT_CANCELLATION_TERMS =
  'يمكن إلغاء اتفاق المشروع بالتراضي قبل التمويل. بعد التمويل تُطبَّق قواعد الضمان والإلغاء المعتمدة في المنصة.';

export const DEFAULT_DISPUTE_TERMS =
  'في حال الخلاف يفتح أحد الطرفين نزاعًا عبر المنصة، وتراجعه الإدارة وفق آلية النزاعات والضمان.';

export const ACTIVE_AGREEMENT_STATUSES = [
  'PENDING_APPROVAL',
  'APPROVED',
  'PAYMENT_PENDING',
  'FUNDED',
  'ACTIVE',
  'DISPUTED',
] as const;
