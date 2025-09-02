import { Module } from '@nestjs/common';
import { InngestModule } from '../../src';
import { UserService } from './user.service';
import { NotificationService } from './notification.service';

@Module({
  imports: [
    InngestModule.forRoot({
      id: 'my-nestjs-app',
      eventKey: process.env.INNGEST_EVENT_KEY,
      signingKey: process.env.INNGEST_SIGNING_KEY,
      baseUrl: process.env.INNGEST_BASE_URL || 'https://api.inngest.com',
      isGlobal: true,
    }),
  ],
  providers: [UserService, NotificationService],
})
export class AppModule {}