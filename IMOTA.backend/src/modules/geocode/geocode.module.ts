import { Module } from '@nestjs/common';
import { GeocodeService } from './geocode.service';
import { GeocodeController } from './geocode.controller';

@Module({ providers:[GeocodeService], controllers:[GeocodeController], exports:[GeocodeService] })
export class GeocodeModule {}
