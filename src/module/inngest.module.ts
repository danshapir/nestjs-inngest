import { Module, DynamicModule, Global, Provider, Type } from '@nestjs/common';
import { ConfigurableModuleBuilder } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { 
  InngestModuleOptions, 
  InngestModuleAsyncOptions, 
  InngestOptionsFactory 
} from '../interfaces';
import { InngestService } from '../services/inngest.service';
import { InngestExplorer } from '../services/inngest.explorer';
import { InngestController } from '../services/inngest.controller';
import { INNGEST_MODULE_OPTIONS } from '../constants';

const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } = 
  new ConfigurableModuleBuilder<InngestModuleOptions>()
    .setExtras(
      {
        isGlobal: false,
      },
      (definition, extras) => ({
        ...definition,
        global: extras.isGlobal,
      }),
    )
    .setClassMethodName('forRoot')
    .build();

@Global()
@Module({
  imports: [DiscoveryModule],
  providers: [InngestService, InngestExplorer],
  controllers: [InngestController],
  exports: [InngestService],
})
export class InngestModule {
  static forRoot(options: InngestModuleOptions): DynamicModule {
    return {
      module: InngestModule,
      global: options.isGlobal ?? false,
      imports: [DiscoveryModule],
      providers: [
        {
          provide: INNGEST_MODULE_OPTIONS,
          useValue: options,
        },
        InngestService,
        InngestExplorer,
      ],
      controllers: [InngestController],
      exports: [InngestService, INNGEST_MODULE_OPTIONS],
    };
  }

  static forRootAsync(options: InngestModuleAsyncOptions): DynamicModule {
    const providers: Provider[] = [];

    if (options.useFactory) {
      providers.push({
        provide: INNGEST_MODULE_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject || [],
      });
    } else if (options.useClass) {
      providers.push(
        {
          provide: options.useClass,
          useClass: options.useClass,
        },
        {
          provide: INNGEST_MODULE_OPTIONS,
          useFactory: async (optionsFactory: InngestOptionsFactory) =>
            await optionsFactory.createInngestOptions(),
          inject: [options.useClass],
        },
      );
    } else if (options.useExisting) {
      providers.push({
        provide: INNGEST_MODULE_OPTIONS,
        useFactory: async (optionsFactory: InngestOptionsFactory) =>
          await optionsFactory.createInngestOptions(),
        inject: [options.useExisting],
      });
    }

    return {
      module: InngestModule,
      global: options.isGlobal ?? false,
      imports: [DiscoveryModule, ...(options.imports || [])],
      providers: [
        ...providers,
        InngestService,
        InngestExplorer,
      ],
      controllers: [InngestController],
      exports: [InngestService, INNGEST_MODULE_OPTIONS],
    };
  }

  static forFeature(): DynamicModule {
    return {
      module: InngestModule,
      imports: [DiscoveryModule],
      providers: [InngestExplorer],
      exports: [],
    };
  }
}