import { Controller, Get, Header, Res } from '@nestjs/common';
import type { Response } from 'express';
import { MetricsService } from '../metrics/metrics.service';

/**
 * Prometheus scrape endpoint. Uses /admin/metrics so it inherits the same
 * basic-auth gate as the rest of the admin surface. Prometheus servers
 * configure the credentials in their scrape_config.
 */
@Controller('admin/metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  async scrape(@Res() res: Response): Promise<void> {
    res.setHeader('Content-Type', this.metrics.contentType);
    res.send(await this.metrics.render());
  }
}
