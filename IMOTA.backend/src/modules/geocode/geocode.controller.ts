import { Controller, Get, Query } from '@nestjs/common';
import { GeocodeService } from './geocode.service';

@Controller('geocode')
export class GeocodeController {
  constructor(private g: GeocodeService){}

  @Get('forward')
  async forward(@Query('q') q:string, @Query('region') region='zw'){
    if(!q) return {};
    return await this.g.forward(q, region) || {};
  }

  @Get('autocomplete')
  async autocomplete(@Query('q') q:string, @Query('region') region='zw', @Query('limit') limit='5'){
    if(!q) return { suggestions: [] };
    const n = Math.min(10, Math.max(1, parseInt(limit||'5',10)));
    const suggestions = await this.g.suggest(q, region, n);
    return { suggestions };
  }
}
