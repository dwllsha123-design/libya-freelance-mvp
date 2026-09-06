import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

/**
 * Optional Redis client.
 *
 * - REDIS_URL unset → memory presence allowed (single-instance / local only)
 * - REDIS_URL set but down → do NOT fall back to memory for presence reads/writes
 *   (avoids split-brain across replicas); messaging continues without shared presence
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private subClient: Redis | null = null;
  private available = false;
  private configured = false;
  private connectPromise: Promise<void> | null = null;

  constructor(private readonly config: ConfigService) {}

  /** True when REDIS_URL was provided (even if currently disconnected). */
  isConfigured(): boolean {
    return this.configured;
  }

  /**
   * In-process presence is only safe when Redis was never configured
   * (explicit single-instance / local mode).
   */
  allowsMemoryPresenceFallback(): boolean {
    return !this.configured;
  }

  async connect(): Promise<void> {
    if (this.connectPromise) {
      return this.connectPromise;
    }
    this.connectPromise = this.doConnect();
    return this.connectPromise;
  }

  private async doConnect(): Promise<void> {
    const url = this.config.get<string>('redis.url')?.trim();
    if (!url) {
      this.configured = false;
      this.logger.warn(
        'REDIS_URL not set — presence uses in-memory store (single-instance only)',
      );
      return;
    }

    this.configured = true;

    try {
      // rediss:// (TLS) is supported by ioredis automatically — used by some Railway Redis plugins.
      this.client = new Redis(url, {
        maxRetriesPerRequest: 2,
        enableReadyCheck: true,
        retryStrategy: (times: number) => Math.min(times * 200, 2000),
      });
      this.subClient = this.client.duplicate();

      this.client.on('error', (err: Error) => {
        this.available = false;
        this.logger.error(`Redis client error: ${err.message}`);
      });
      this.subClient.on('error', (err: Error) => {
        this.logger.error(`Redis subscriber error: ${err.message}`);
      });
      this.client.on('ready', () => {
        this.available = true;
        this.logger.log('Redis ready');
      });
      this.client.on('end', () => {
        this.available = false;
        this.logger.warn('Redis connection ended');
      });

      await this.client.ping();
      await this.subClient.ping();
      this.available = true;
      this.logger.log('Redis connected for presence / Socket.IO adapter');
    } catch (error) {
      this.available = false;
      try {
        this.client?.disconnect();
        this.subClient?.disconnect();
      } catch {
        /* ignore */
      }
      this.client = null;
      this.subClient = null;
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Redis unavailable — presence degraded (no memory split-brain): ${message}`,
      );
    }
  }

  isAvailable(): boolean {
    return this.available && !!this.client;
  }

  getClient(): Redis | null {
    return this.isAvailable() ? this.client : null;
  }

  getAdapterClients(): { pub: Redis; sub: Redis } | null {
    if (!this.isAvailable() || !this.client || !this.subClient) {
      return null;
    }
    return { pub: this.client, sub: this.subClient };
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  async disconnect(): Promise<void> {
    const tasks: Promise<unknown>[] = [];
    if (this.client) tasks.push(this.client.quit().catch(() => undefined));
    if (this.subClient) tasks.push(this.subClient.quit().catch(() => undefined));
    await Promise.all(tasks);
    this.client = null;
    this.subClient = null;
    this.available = false;
  }
}
