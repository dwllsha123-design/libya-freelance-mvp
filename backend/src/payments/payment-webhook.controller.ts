import {
  Controller,
  Headers,
  Inject,
  Optional,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../common/decorators/public.decorator.js';
import { PAYMENT_COMPLETION_HANDLER } from './payment-completion.handler.js';
import type { PaymentCompletionHandler } from './payment-completion.handler.js';
import { PaymentService } from './payment.service.js';

@Controller('payments/webhooks')
export class PaymentWebhookController {
  constructor(
    private readonly payments: PaymentService,
    @Optional()
    @Inject(PAYMENT_COMPLETION_HANDLER)
    private readonly completionHandler?: PaymentCompletionHandler,
  ) {}

  @Public()
  @Post(':provider')
  async handleWebhook(
    @Param('provider') provider: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Req() req: RawBodyRequest<Request>,
  ) {
    const rawBody =
      req.rawBody ??
      (typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {}));

    const result = await this.payments.handleProviderWebhook(provider, headers, rawBody);

    if (
      result.handled &&
      'paymentId' in result &&
      'escrowId' in result &&
      result.paymentId &&
      result.escrowId &&
      this.completionHandler
    ) {
      await this.completionHandler.onEscrowFundingSucceeded(result.paymentId);
    }

    return result;
  }
}
