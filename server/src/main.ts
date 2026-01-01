import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });
  const port = process.env.PORT ?? 3000;
  const host = '0.0.0.0'; // Listen on all network interfaces
  await app.listen(port, host);
  console.log(`🃏 Poker server running on http://0.0.0.0:${port}`);
  console.log(`🌐 LAN access: http://192.168.99.228:${port}`);
}
bootstrap();
