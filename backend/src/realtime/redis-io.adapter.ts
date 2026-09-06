import { IoAdapter } from '@nestjs/platform-socket.io';
import { INestApplication, Logger } from '@nestjs/common';
import { createAdapter } from '@socket.io/redis-adapter';
import type { ServerOptions } from 'socket.io';
import { RedisService } from '../redis/redis.service.js';

/**
 * Uses Redis pub/sub when available so Socket.IO rooms work across replicas.
 * Falls back to the default in-memory adapter otherwise.
 */
export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor:
    | ReturnType<typeof createAdapter>
    | null = null;

  constructor(
    app: INestApplication,
    private readonly redis: RedisService,
  ) {
    super(app);
  }

  async connect(): Promise<void> {
    await this.redis.connect();
    const clients = this.redis.getAdapterClients();
    if (!clients) {
      this.logger.warn(
        'Socket.IO using in-memory adapter (no Redis) — multi-instance rooms will not sync',
      );
      return;
    }

    this.adapterConstructor = createAdapter(clients.pub, clients.sub);
    this.logger.log('Socket.IO Redis adapter enabled');
  }

  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, options);
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }
}
