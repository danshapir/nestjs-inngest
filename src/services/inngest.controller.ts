import { 
  Controller, 
  Get, 
  Post, 
  Put,
  Req, 
  Res, 
  Logger,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { serve } from 'inngest/express';
import { InngestService } from './inngest.service';

@Controller()
export class InngestController {
  private readonly logger = new Logger(InngestController.name);
  private handler: any;

  constructor(private readonly inngestService: InngestService) {
    this.initializeHandler();
  }

  private initializeHandler() {
    const options = this.inngestService.getOptions();
    const functions = this.inngestService.getFunctions();
    const client = this.inngestService.getClient();

    this.logger.debug(`Initializing handler with ${functions.length} functions`);
    this.logger.debug(`Functions: ${functions.map(f => f.id || f.name || 'unnamed').join(', ')}`);
    this.logger.debug(`Client ID: ${client.id}`);

    // Create the serve handler with configuration
    this.handler = serve({
      client,
      functions,
      signingKey: options.signingKey,
      // landingPage: options.landingPage !== false, // Commented out due to API changes
      // streaming: 'allow', // Commented out due to API changes
    } as any);

    this.logger.log(
      `Inngest handler initialized with ${functions.length} functions at path: ${options.path || '/inngest'}`,
    );
  }

  @Get('inngest')
  async handleGet(@Req() req: Request, @Res() res: Response) {
    // Re-initialize handler to pick up any newly registered functions
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

  @Post('inngest')
  async handlePost(@Req() req: Request, @Res() res: Response) {
    // Re-initialize handler to pick up any newly registered functions
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

  @Put('inngest')
  async handlePut(@Req() req: Request, @Res() res: Response) {
    // Re-initialize handler to pick up any newly registered functions
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