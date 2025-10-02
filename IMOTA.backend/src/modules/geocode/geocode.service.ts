import { Injectable } from '@nestjs/common';

@Injectable()
export class GeocodeService {
  private async j(u:string){ const r=await fetch(u); if(!r.ok) throw new Error('geocode http '+r.status); return r.json() }

  async forward(t:string,region='zw'){
    t=t.trim();
    const oc=process.env.OPENCAGE_API_KEY;
    if(oc){
      const u=`https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(t)}&key=${oc}&countrycode=${region}&limit=3`;
      const d=await this.j(u); const b=d.results?.[0];
      if(b) return { lat:b.geometry.lat, lng:b.geometry.lng, formatted:b.formatted||t, confidence:b.confidence||6 };
    }
    const g=process.env.GEOCODE_API_KEY; // Google Geocoding (not Places)
    if(g){
      const u=`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(t)}&key=${g}&region=${region}`;
      const d=await this.j(u); const b=d.results?.[0];
      if(b) return { lat:b.geometry.location.lat, lng:b.geometry.location.lng, formatted:b.formatted_address||t, confidence:b.partial_match?5:9 };
    }
    return null;
  }

  // NEW: simple autocomplete using OpenCage multi-result or Google Geocoding multi-result
  async suggest(q:string, region='zw', limit=5){
    q=q.trim();
    const out: Array<{ label:string; lat:number; lng:number }> = [];
    const oc=process.env.OPENCAGE_API_KEY;
    if(oc){
      const u=`https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(q)}&key=${oc}&countrycode=${region}&limit=${Math.min(limit,10)}`;
      const d=await this.j(u);
      for(const r of d.results||[]){
        out.push({ label: r.formatted, lat: r.geometry.lat, lng: r.geometry.lng });
      }
      return out.slice(0,limit);
    }
    const g=process.env.GEOCODE_API_KEY;
    if(g){
      const u=`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&key=${g}&region=${region}`;
      const d=await this.j(u);
      for(const r of d.results||[]){
        out.push({ label: r.formatted_address, lat: r.geometry.location.lat, lng: r.geometry.location.lng });
      }
      return out.slice(0,limit);
    }
    // No keys? return empty list
    return out;
  }
}
