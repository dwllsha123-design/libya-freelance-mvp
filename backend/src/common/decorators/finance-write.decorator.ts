import { SetMetadata } from '@nestjs/common';

export const FINANCE_WRITE_KEY = 'financeWrite';

/** Mutating commercial settings — SUPER_ADMIN or ADMIN with FINANCE_WRITE */
export const RequireFinanceWrite = () => SetMetadata(FINANCE_WRITE_KEY, true);
