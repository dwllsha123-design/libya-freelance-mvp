import { Logger } from '@nestjs/common';
import { createApp } from './bootstrap.js';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  const app = await createApp();
  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 4000);
  const host = process.env.HOST ?? '0.0.0.0';

  await app.listen(port, host);
  logger.log(`API listening on ${host}:${port}`);

  const shutdown = async (signal: string) => {
    logger.log(`Received ${signal} — shutting down gracefully`);
    await app.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

await bootstrap();
