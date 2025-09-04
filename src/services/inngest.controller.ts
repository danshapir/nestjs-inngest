import { Controller, Get, Post, Put, Req, Res, Logger, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { serve } from 'inngest/express';
import { InngestService } from './inngest.service';

// Create a controller factory that uses the configured path
export function createInngestController(path: string = 'inngest') {
  // Ensure path doesn't start with slash for decorator
  const cleanPath = path.replace(/^\//, '');

  @Controller(cleanPath)
  class DynamicInngestController {
    public readonly logger = new Logger(`InngestController(${cleanPath})`);
    public handler: any;

    constructor(public readonly inngestService: InngestService) {
      this.initializeHandler();
    }

    public initializeHandler() {
      const options = this.inngestService.getOptions();
      const functions = this.inngestService.getFunctions();
      const client = this.inngestService.getClient();

      this.logger.debug(`Initializing handler with ${functions.length} functions`);
      this.logger.debug(
        `Functions: ${functions.map((f) => f.id || f.name || 'unnamed').join(', ')}`,
      );
      this.logger.debug(`Client ID: ${client.id}`);

      // Create the serve handler with configuration
      this.handler = serve({
        client,
        functions,
        signingKey: options.signingKey,
        serveHost: options.serveHost,
        servePath: options.path ? `/${options.path.replace(/^\//, '')}` : undefined,
      });

      this.logger.log(
        `Inngest handler initialized with ${functions.length} functions at path: /${cleanPath}`,
      );
    }

    @Get()
    async handleGet(@Req() req: Request, @Res() res: Response) {
      this.initializeHandler();
      try {
        await this.handler(req, res);
      } catch (error) {
        this.logger.error(`Error handling GET request: ${error.message}`, error.stack);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          error: 'Internal server error',
          message: error.message,
        });
      }
    }

    @Post()
    async handlePost(@Req() req: Request, @Res() res: Response) {
      this.initializeHandler();
      try {
        await this.handler(req, res);
      } catch (error) {
        this.logger.error(`Error handling POST request: ${error.message}`, error.stack);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          error: 'Internal server error',
          message: error.message,
        });
      }
    }

    @Put()
    async handlePut(@Req() req: Request, @Res() res: Response) {
      this.initializeHandler();
      try {
        await this.handler(req, res);
      } catch (error) {
        this.logger.error(`Error handling PUT request: ${error.message}`, error.stack);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          error: 'Internal server error',
          message: error.message,
        });
      }
    }
  }

  return DynamicInngestController;
}

// Export a default controller for backward compatibility
export const InngestController: any = createInngestController();
