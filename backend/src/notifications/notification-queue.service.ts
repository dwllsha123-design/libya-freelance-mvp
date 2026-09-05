import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';

export type NotificationJobKind =
  | 'deliver_channels'
  | 'match_project'
  | 'deadline_scan'
  | 'retry_delivery';

export interface NotificationJob {
  id: string;
  kind: NotificationJobKind;
  payload: Record<string, unknown>;
  attempts: number;
  maxAttempts: number;
  runAt: number;
}

type JobHandler = (job: NotificationJob) => Promise<void>;

/**
 * In-process notification queue with delayed retries.
 * Abstraction can later be swapped for Redis/Bull without changing callers.
 */
@Injectable()
export class NotificationQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(NotificationQueueService.name);
  private readonly handlers = new Map<NotificationJobKind, JobHandler>();
  private readonly queue: NotificationJob[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private processing = false;
  private seq = 0;

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  register(kind: NotificationJobKind, handler: JobHandler) {
    this.handlers.set(kind, handler);
    this.ensureTimer();
  }

  enqueue(
    kind: NotificationJobKind,
    payload: Record<string, unknown>,
    options?: { delayMs?: number; maxAttempts?: number },
  ): string {
    const id = `nq_${Date.now()}_${++this.seq}`;
    this.queue.push({
      id,
      kind,
      payload,
      attempts: 0,
      maxAttempts: options?.maxAttempts ?? 3,
      runAt: Date.now() + (options?.delayMs ?? 0),
    });
    this.ensureTimer();
    void this.tick();
    return id;
  }

  private ensureTimer() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.tick();
    }, 750);
  }

  private async tick() {
    if (this.processing) return;
    this.processing = true;
    try {
      const now = Date.now();
      const readyIdx = this.queue.findIndex((j) => j.runAt <= now);
      if (readyIdx < 0) return;
      const [job] = this.queue.splice(readyIdx, 1);
      if (!job) return;

      const handler = this.handlers.get(job.kind);
      if (!handler) {
        this.logger.warn(`No handler for notification job ${job.kind}`);
        return;
      }

      try {
        await handler(job);
      } catch (err) {
        job.attempts += 1;
        const message = err instanceof Error ? err.message : 'unknown';
        this.logger.warn(
          `Notification job ${job.id} (${job.kind}) failed attempt ${job.attempts}: ${message}`,
        );
        if (job.attempts < job.maxAttempts) {
          const delay = Math.min(30_000, 1000 * 2 ** job.attempts);
          job.runAt = Date.now() + delay;
          this.queue.push(job);
        }
      }
    } finally {
      this.processing = false;
    }
  }
}
