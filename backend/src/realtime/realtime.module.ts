import { Global, Module } from '@nestjs/common';
import { RealtimeSessionService } from './realtime-session.service.js';

@Global()
@Module({
  providers: [RealtimeSessionService],
  exports: [RealtimeSessionService],
})
export class RealtimeModule {}
