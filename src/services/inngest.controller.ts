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
      const serveOptions: any = {
        client,
        functions,
        signingKey: options.signingKey,
      };

      // Build serveHost URL if needed (matching the logic in inngest.service.ts)
      if (options.serveHost) {
        if (options.serveHost.startsWith('http://') || options.serveHost.startsWith('https://')) {
          // serveHost is a full URL, use it directly
          serveOptions.serveHost = options.serveHost;
        } else {
          // serveHost is just hostname, construct URL with port
          const port = options.servePort || process.env.PORT || 3000;
          serveOptions.serveHost = `http://${options.serveHost}:${port}`;
        }
      }

      // Only pass servePath if path is configured
      if (options.path) {
        serveOptions.servePath = `/${options.path.replace(/^\//, '')}`;
      }

      this.handler = serve(serveOptions);

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
