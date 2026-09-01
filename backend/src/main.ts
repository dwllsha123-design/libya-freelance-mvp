import { createApp } from './bootstrap.js';

async function bootstrap() {
  const app = await createApp();
  const port = process.env.PORT ?? 4000;
  await app.listen(port);
}

await bootstrap();
