
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import 'cross-fetch/dist/node-polyfill.js';
import { initNotificationWorkers } from './modules/notifications/queues';
async function bootstrap(){
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser()); app.enableCors({ origin:true, credentials:true });
  app.useGlobalPipes(new ValidationPipe({ whitelist:true, transform:true }));
  initNotificationWorkers(); await app.listen(process.env.PORT||3000);
  console.log('IMOTA API up on', process.env.PORT||3000);
}
bootstrap();
