import { Test, TestingModule } from '@nestjs/testing';
import { InngestModule } from '../src/module/inngest.module';
import { InngestService } from '../src/services/inngest.service';
import { InngestModuleOptions, InngestOptionsFactory } from '../src/interfaces';
import { Injectable } from '@nestjs/common';

describe('InngestModule', () => {
  describe('forRoot', () => {
    it('should create a module with options', async () => {
      const options: InngestModuleOptions = {
        id: 'test-app',
        eventKey: 'test-key',
        isGlobal: true,
      };

      const module: TestingModule = await Test.createTestingModule({
        imports: [InngestModule.forRoot(options)],
      }).compile();

      const service = module.get<InngestService>(InngestService);
      expect(service).toBeDefined();
      expect(service.getOptions()).toEqual(options);

      await module.close();
    });

    it('should create a non-global module by default', async () => {
      const options: InngestModuleOptions = {
        id: 'test-app',
        eventKey: 'test-key',
      };

      const module: TestingModule = await Test.createTestingModule({
        imports: [InngestModule.forRoot(options)],
      }).compile();

      const service = module.get<InngestService>(InngestService);
      expect(service).toBeDefined();

      await module.close();
    });
  });

  describe('forRootAsync', () => {
    it('should create a module with useFactory', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          InngestModule.forRootAsync({
            useFactory: () => ({
              id: 'async-app',
              eventKey: 'async-key',
            }),
          }),
        ],
      }).compile();

      const service = module.get<InngestService>(InngestService);
      expect(service).toBeDefined();
      expect(service.getOptions().id).toBe('async-app');

      await module.close();
    });

    it('should create a module with useClass', async () => {
      @Injectable()
      class ConfigService implements InngestOptionsFactory {
        createInngestOptions(): InngestModuleOptions {
          return {
            id: 'class-app',
            eventKey: 'class-key',
          };
        }
      }

      const module: TestingModule = await Test.createTestingModule({
        imports: [
          InngestModule.forRootAsync({
            useClass: ConfigService,
          }),
        ],
      }).compile();

      const service = module.get<InngestService>(InngestService);
      expect(service).toBeDefined();
      expect(service.getOptions().id).toBe('class-app');

      await module.close();
    });

    it('should create a module with useExisting', async () => {
      @Injectable()
      class ConfigService implements InngestOptionsFactory {
        createInngestOptions(): InngestModuleOptions {
          return {
            id: 'existing-app',
            eventKey: 'existing-key',
          };
        }
      }

      const module: TestingModule = await Test.createTestingModule({
        providers: [ConfigService],
        imports: [
          InngestModule.forRootAsync({
            useExisting: ConfigService,
            imports: [],
          }),
        ],
      }).compile();

      const service = module.get<InngestService>(InngestService);
      expect(service).toBeDefined();
      expect(service.getOptions().id).toBe('existing-app');

      await module.close();
    });

    it('should support async factory', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          InngestModule.forRootAsync({
            useFactory: async () => {
              await new Promise(resolve => setTimeout(resolve, 10));
              return {
                id: 'async-factory-app',
                eventKey: 'async-factory-key',
              };
            },
          }),
        ],
      }).compile();

      const service = module.get<InngestService>(InngestService);
      expect(service).toBeDefined();
      expect(service.getOptions().id).toBe('async-factory-app');

      await module.close();
    });
  });

  describe('forFeature', () => {
    it('should create a feature module', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          InngestModule.forRoot({
            id: 'root-app',
            eventKey: 'root-key',
          }),
          InngestModule.forFeature(),
        ],
      }).compile();

      expect(module).toBeDefined();
      await module.close();
    });
  });
});