
import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { StateService } from './state.service';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppController } from './whatsapp.controller';
import { UssdController } from './ussd.controller';
import { GeocodeModule } from '../geocode/geocode.module';

@Module({ imports:[GeocodeModule], controllers:[WhatsAppController, UssdController], providers:[PrismaService, StateService, WhatsAppService] })
export class ChannelsModule {}
