import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { InngestModule } from '../../src';
import { InngestConfigService } from './config.service';
import { TaskService } from './task.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Async configuration with useClass
    InngestModule.forRootAsync({
      useClass: InngestConfigService,
      isGlobal: true,
    }),
    // Alternative: async configuration with useFactory
    /*
    InngestModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        id: configService.get('APP_NAME', 'nestjs-inngest-app'),
        eventKey: configService.get('INNGEST_EVENT_KEY'),
        signingKey: configService.get('INNGEST_SIGNING_KEY'),
        baseUrl: configService.get('INNGEST_BASE_URL', 'https://api.inngest.com'),
        isGlobal: true,
      }),
      inject: [ConfigService],
    }),
    */
  ],
  providers: [InngestConfigService, TaskService],
})
export class AppModule {}