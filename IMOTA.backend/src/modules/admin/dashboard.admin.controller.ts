import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminKeyGuard } from '../../common/admin-key.guard';
import { PrismaService } from '../../prisma.service';

@UseGuards(AdminKeyGuard)
@Controller('admin/dashboard')
export class AdminDashboardController {
  constructor(private prisma: PrismaService) {}

  @Get('summary')
  async summary() {
    const now = new Date();
    const start30 = new Date(now);
    start30.setDate(start30.getDate() - 30);
    const startToday = new Date(now);
    startToday.setHours(0, 0, 0, 0);

    // Safe helpers that never throw
    const safeCount = async (fn: () => Promise<number>, fallback = 0) => {
      try { return await fn(); } catch { return fallback; }
    };
    const safeAggregateSum = async <T extends { _sum?: { amount?: number | null } }>(
      fn: () => Promise<T>,
      fallback = 0,
    ) => {
      try {
        const res = await fn();
        // Handle various shapes safely
        // @ts-ignore
        const val = res?._sum?.amount ?? 0;
        return typeof val === 'number' ? val : Number(val || 0);
      } catch {
        return fallback;
      }
    };
    const safeQuery = async <T>(fn: () => Promise<T>, fallback: T) => {
      try { return await fn(); } catch { return fallback; }
    };

    // Totals
    const totalUsers = await safeCount(() => this.prisma.user.count());
    const totalDrivers = await safeCount(() => this.prisma.driver.count());
    const totalCompleted = await safeCount(() =>
      this.prisma.ride.count({ where: { status: 'COMPLETED' } }),
    );
    const completedToday = await safeCount(() =>
      this.prisma.ride.count({
        where: { status: 'COMPLETED', completedAt: { gte: startToday } },
      }),
    );

    const totalRevenueCents = await safeAggregateSum(() =>
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: { in: ['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'] } },
      }),
    );

    // Optional models: Refund, Payout, DriverLocation might not exist in your schema yet
    const refundsCents = await safeAggregateSum(async () => {
      // @ts-ignore – allow missing model
      return await this.prisma.refund.aggregate({
        _sum: { amount: true },
        where: { status: 'SUCCEEDED' },
      });
    });

    const payoutsCents = await safeAggregateSum(async () => {
      // @ts-ignore – allow missing model
      return await this.prisma.payout.aggregate({
        _sum: { amount: true },
        where: { status: { in: ['SETTLED'] } },
      });
    });

    const activeDrivers = await safeCount(async () => {
      // @ts-ignore – allow missing model
      return await this.prisma.driverLocation.count({
        where: { updatedAt: { gte: new Date(Date.now() - 5 * 60 * 1000) } },
      });
    });

    const liveTrips = await safeCount(() =>
      this.prisma.ride.count({
        where: {
          status: {
            // @ts-ignore allow string union if your enum differs
            in: ['REQUESTED', 'DRIVER_ASSIGNED', 'DRIVER_ARRIVING', 'IN_PROGRESS'] as any,
          },
        },
      }),
    );

    // Trends (last 30 days) – fall back to []
    const tripsByDay = await safeQuery(async () => {
      return await this.prisma.$queryRaw<
        Array<{ d: Date; trips: bigint | number }>
      >`select date_trunc('day', "completedAt") as d, count(*)::bigint as trips
         from "Ride"
         where status='COMPLETED' and "completedAt" >= ${start30}
         group by 1 order by 1 asc`;
    }, [] as Array<{ d: Date; trips: bigint | number }>);

    const revenueByDay = await safeQuery(async () => {
      return await this.prisma.$queryRaw<
        Array<{ d: Date; cents: bigint | number }>
      >`select date_trunc('day', "createdAt") as d, sum("amount")::bigint as cents
         from "Payment"
         where status in ('PAID','PARTIALLY_REFUNDED','REFUNDED') and "createdAt" >= ${start30}
         group by 1 order by 1 asc`;
    }, [] as Array<{ d: Date; cents: bigint | number }>);

    // Normalize bigint → number for JSON
    const normTrips = tripsByDay.map(r => ({
      d: r.d,
      trips: Number(r.trips),
    }));
    const normRevenue = revenueByDay.map(r => ({
      d: r.d,
      cents: Number(r.cents),
    }));

    return {
      totals: {
        users: totalUsers,
        drivers: totalDrivers,
        completedTrips: totalCompleted,
        completedToday,
        revenueCents: totalRevenueCents || 0,
        refundsCents: refundsCents || 0,
        payoutsCents: payoutsCents || 0,
        activeDrivers,
        liveTrips,
      },
      trends: {
        tripsByDay: normTrips,
        revenueByDay: normRevenue,
      },
    };
  }

  // “Heatmap-ish” bins of pickups (last N days), coarse 0.02° bins
  @Get('heatmap')
  async heatmap(@Query('days') days = '7') {
    const n = Math.max(1, Math.min(90, parseInt(String(days) || '7', 10)));
    const since = new Date(Date.now() - n * 24 * 60 * 60 * 1000);

    const rows = await (async () => {
      try {
        return await this.prisma.$queryRaw<
          Array<{ latbin: number; lngbin: number; c: bigint | number }>
        >`select round("pickupLat"::numeric, 2) as latbin,
                 round("pickupLng"::numeric, 2) as lngbin,
                 count(*)::bigint as c
           from "Ride"
           where "createdAt" >= ${since}
           group by 1,2
           order by 3 desc
           limit 500`;
      } catch {
        return [] as Array<{ latbin: number; lngbin: number; c: bigint | number }>;
      }
    })();

    return {
      bins: rows.map(r => ({
        lat: Number(r.latbin),
        lng: Number(r.lngbin),
        count: Number(r.c),
      })),
      since,
    };
  }

  // Live trips with latest driver location (if assigned)
  @Get('live')
  async live() {
    const rides = await (async () => {
      try {
        return await this.prisma.ride.findMany({
          where: {
            status: {
              // @ts-ignore
              in: ['REQUESTED', 'DRIVER_ASSIGNED', 'DRIVER_ARRIVING', 'IN_PROGRESS'] as any,
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 200,
          include: { driver: true },
        } as any);
      } catch {
        return [] as any[];
      }
    })();

    // driver locations (optional model)
    const driverIds = rides.filter(r => r.driverId).map(r => r.driverId as string);
    const locations = await (async () => {
      try {
        // @ts-ignore – allow missing model
        return await this.prisma.driverLocation.findMany({
          where: { driverId: { in: driverIds } },
        });
      } catch {
        return [] as any[];
      }
    })();

    const locMap = new Map(locations.map(l => [l.driverId, l]));
    const out = rides.map(r => ({
      id: r.id,
      status: r.status,
      riderId: r.riderId,
      driverId: r.driverId,
      pickup: { lat: r.pickupLat, lng: r.pickupLng },
      dropoff: { lat: r.dropoffLat, lng: r.dropoffLng },
      driverLoc: r.driverId ? locMap.get(r.driverId) || null : null,
      createdAt: r.createdAt,
      startedAt: r.startedAt,
    }));

    return { rides: out };
  }
}
