
import { Module } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

@Module({ providers:[RealtimeGateway, PrismaService, JwtService], exports:[RealtimeGateway] })
export class RealtimeModule {}

