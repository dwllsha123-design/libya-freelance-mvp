import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import type { AuthUser } from '../auth/types/auth-user.type.js';
import { InitiateEscrowPaymentDto } from './dto/payment.dto.js';
import { PaymentService } from './payment.service.js';

@Controller('payments')
export class PaymentController {
  constructor(private readonly payments: PaymentService) {}

  @Post('escrow/:escrowId/initiate')
  @Roles(Role.CLIENT)
  initiateEscrowFunding(
    @CurrentUser() user: AuthUser,
    @Param('escrowId') escrowId: string,
    @Body() dto: InitiateEscrowPaymentDto,
  ) {
    return this.payments.initiateEscrowFunding(user.id, escrowId, {
      returnUrl: dto.returnUrl,
      cancelUrl: dto.cancelUrl,
    });
  }

  @Get(':paymentId')
  @Roles(Role.CLIENT)
  getPayment(@CurrentUser() user: AuthUser, @Param('paymentId') paymentId: string) {
    return this.payments.getPaymentForClient(user.id, paymentId);
  }
}
