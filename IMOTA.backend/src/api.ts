import axios from 'axios';
import { API_BASE } from './config';

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type':'application/json' }
});

// Helpers
export async function estimateRide(pickup:{lat:number,lng:number}, dropoff:{lat:number,lng:number}){
  const {data} = await api.post('/rides/estimate', {
    pickupLat: pickup.lat, pickupLng: pickup.lng,
    dropoffLat: dropoff.lat, dropoffLng: dropoff.lng
  });
  return data; // { distanceKm, durationMin, estimateCents, currency }
}

export async function requestRide(pickup:{lat:number,lng:number}, dropoff:{lat:number,lng:number}){
  const {data} = await api.post('/rides/request', {
    pickupLat: pickup.lat, pickupLng: pickup.lng,
    dropoffLat: dropoff.lat, dropoffLng: dropoff.lng
  });
  return data; // ride
}

export async function getRide(id:string){
  const {data} = await api.get(`/rides/${id}`);
  return data;
}

export async function createPaymentIntent(rideId:string, method:'ECOCASH'|'CARD', amountCents:number, phone?:string){
  const payload:any = { rideId, method, amount: amountCents, currency:'USD' };
  if(method==='ECOCASH') payload.phone = phone;
  const {data} = await api.post('/payments/intent', payload);
  return data; // intent
}

export async function getPaymentIntent(id:string){
  const {data} = await api.get(`/payments/intent/${id}`);
  return data;
}

// server geocode (uses OpenCage/Google via backend)
export async function geocodeForward(query:string){
  const {data} = await api.get(`/geocode/forward`, { params: { q: query, region:'zw' } })
  return data; // you’ll expose this tiny pass-through; or call WhatsApp geocode service if you already wrote one
}
