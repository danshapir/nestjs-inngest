import { Injectable } from '@nestjs/common';
import { InngestOptionsFactory, InngestModuleOptions } from '../../src';

@Injectable()
export class InngestConfigService implements InngestOptionsFactory {
  createInngestOptions(): InngestModuleOptions {
    return {
      id: process.env.APP_NAME || 'nestjs-inngest-app',
      eventKey: process.env.INNGEST_EVENT_KEY!,
      signingKey: process.env.INNGEST_SIGNING_KEY,
      baseUrl: this.getInngestUrl(),
      isGlobal: true,
      landingPage: process.env.NODE_ENV === 'development',
      logger: this.createLogger(),
    };
  }

  private getInngestUrl(): string {
    const env = process.env.NODE_ENV || 'development';
    
    switch (env) {
      case 'development':
        return 'http://localhost:8288';
      case 'staging':
        return 'https://api-staging.inngest.com';
      default:
        return 'https://api.inngest.com';
    }
  }

  private createLogger() {
    // Return custom logger configuration
    return {
      level: process.env.INNGEST_LOG_LEVEL || 'info',
    };
  }
}