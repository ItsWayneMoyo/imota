import { Injectable } from '@nestjs/common';

type LatLng = { lat: number; lng: number };

@Injectable()
export class RouteService {
  private async fetchJson(url: string, opts?: any) {
    const res = await fetch(url, opts);
    if (!res.ok) throw new Error(`Route API error: ${res.status}`);
    return res.json();
  }

  async route(pickup: LatLng, drop: LatLng) {
    // Prefer OpenRouteService if available, else Google Maps Directions
    if (process.env.ORS_API_KEY) {
      const body = {
        coordinates: [[pickup.lng, pickup.lat], [drop.lng, drop.lat]],
        instructions: false
      };

      const res = await fetch(
        'https://api.openrouteservice.org/v2/directions/driving-car/geojson',
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'authorization': process.env.ORS_API_KEY
          },
          body: JSON.stringify(body)
        }
      );

      if (!res.ok) throw new Error(`ORS API error ${res.status}`);
      const data: any = await res.json();

      const feat = data.features?.[0];
      const meters = feat?.properties?.summary?.distance ?? 0;
      const secs = feat?.properties?.summary?.duration ?? 0;
      const coords: [number, number][] = feat?.geometry?.coordinates || [];
      const polyline = this.encodePolyline(coords.map(([lng, lat]) => ({ lat, lng })));

      return {
        distanceKm: meters / 1000,
        durationMin: secs / 60,
        polyline
      };
    }

    if (process.env.GOOGLE_MAPS_API_KEY) {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${pickup.lat},${pickup.lng}&destination=${drop.lat},${drop.lng}&mode=driving&key=${process.env.GOOGLE_MAPS_API_KEY}`;
      const data: any = await this.fetchJson(url);

      const route = data.routes?.[0];
      const leg = route?.legs?.[0];

      return {
        distanceKm: (leg?.distance?.value ?? 0) / 1000,
        durationMin: (leg?.duration?.value ?? 0) / 60,
        polyline: route?.overview_polyline?.points ?? ''
      };
    }

    throw new Error('No routing provider configured. Set ORS_API_KEY or GOOGLE_MAPS_API_KEY.');
  }

  // Google encoded polyline algorithm
  private encodePolyline(points: { lat: number; lng: number }[]) {
    function encode(val: number) {
      let v = Math.round(val * 1e5);
      v <<= 1;
      if (val < 0) v = ~v;
      let output = '';
      while (v >= 0x20) {
        output += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
        v >>= 5;
      }
      output += String.fromCharCode(v + 63);
      return output;
    }

    let lastLat = 0, lastLng = 0, result = '';
    for (const p of points) {
      const lat = Math.round(p.lat * 1e5);
      const lng = Math.round(p.lng * 1e5);
      result += encode(lat - lastLat);
      result += encode(lng - lastLng);
      lastLat = lat;
      lastLng = lng;
    }
    return result;
  }
}
