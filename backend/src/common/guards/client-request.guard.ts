import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  CLIENT_REQUEST_HEADER,
  CLIENT_REQUEST_VALUE,
} from '../../auth/auth-cookie.util.js';

@Injectable()
export class ClientRequestGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers[CLIENT_REQUEST_HEADER];

    if (header !== CLIENT_REQUEST_VALUE) {
      throw new ForbiddenException('طلب غير مصرح');
    }

    return true;
  }
}
