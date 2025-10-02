
import { OnModuleInit } from '@nestjs/common';
import { WebSocketGateway, SubscribeMessage, ConnectedSocket, MessageBody, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { haversineKm } from '../../common/geo.util';

@WebSocketGateway({ cors: { origin: true, credentials: true } })
export class RealtimeGateway implements OnModuleInit {
  @WebSocketServer() server!: Server;
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  onModuleInit() {
    this.server.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth?.token || socket.handshake.query?.token;
        if (!token) return next(new Error('no token'));
        const payload: any = this.jwt.decode(String(token));
        if (!payload?.userId) return next(new Error('bad token'));
        (socket as any).userId = payload.userId;
        const driver = await this.prisma.driver.findUnique({ where: { userId: payload.userId } });
        if (driver) { (socket as any).driverId = driver.id; socket.join(`driver:${driver.id}`); }
        socket.join(`user:${payload.userId}`); next();
      } catch { next(new Error('auth failed')); }
    });
  }

  @SubscribeMessage('ride:subscribe')
  async rideSubscribe(@ConnectedSocket() socket: Socket, @MessageBody() data: any) {
    const rideId = data?.rideId; if (!rideId) return;
    socket.join(`ride:${rideId}`); socket.emit('ride:subscribed', { rideId });
  }

  @SubscribeMessage('ride:unsubscribe')
  async rideUnsubscribe(@ConnectedSocket() socket: Socket, @MessageBody() data: any) {
    const rideId = data?.rideId; if (!rideId) return;
    socket.leave(`ride:${rideId}`); socket.emit('ride:unsubscribed', { rideId });
  }

  @SubscribeMessage('driver:location')
  async driverLocation(@ConnectedSocket() socket: Socket, @MessageBody() data: any) {
    const driverId = (socket as any).driverId; if (!driverId) { socket.emit('error', { message:'not a driver' }); return; }
    const { lat, lng, heading, speedKph } = data || {}; if (typeof lat !== 'number' || typeof lng !== 'number') return;
    await this.prisma.driverLocation.upsert({ where:{ driverId }, update:{ lat,lng,heading: heading ?? null, speedKph: speedKph ?? null, updatedAt:new Date() } as any, create:{ driverId, lat,lng,heading: heading ?? null, speedKph: speedKph ?? null } as any });
    const ride = await this.prisma.ride.findFirst({ where: { driverId, status: { in: ['DRIVER_ASSIGNED','DRIVER_ARRIVING','IN_PROGRESS'] as any } }, orderBy: { createdAt: 'desc' } } as any);
    if (ride) {
      const target = (ride.status === 'IN_PROGRESS') ? { lat: ride.dropoffLat, lng: ride.dropoffLng } : { lat: ride.pickupLat, lng: ride.pickupLng };
      const dist = haversineKm(lat,lng,target.lat,target.lng); const speed = (typeof speedKph==='number'&&speedKph>5)?speedKph:30; const etaMin = Math.max(1, Math.round((dist/speed)*60));
      this.server.to(`ride:${ride.id}`).emit('driver:location', { lat,lng,heading,speedKph,etaMin,distanceKm:+dist.toFixed(2) });
    }
  }

  emitRideStatus(rideId:string, status:string, extra?:any) { this.server.to(`ride:${rideId}`).emit('ride:status', { status, ...(extra||{}) }); }
  notifyUser(userId:string, event:string, payload:any) { this.server.to(`user:${userId}`).emit(event, payload); }
}

