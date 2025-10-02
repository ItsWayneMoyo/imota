import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, Button, Alert, Modal, ActivityIndicator, Linking } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { estimateRide, requestRide, getRide, createPaymentIntent, getPaymentIntent } from './src/api';
import { connectSocket, getSocket, disconnectSocket } from './src/socket';

export default function App(){
  const [region, setRegion] = useState<any>({ latitude: -17.8292, longitude: 31.0522, latitudeDelta: 0.05, longitudeDelta: 0.05 }); // Harare default
  const [pickup, setPickup] = useState<{lat:number,lng:number}|null>(null);
  const [dropoff, setDropoff] = useState<{lat:number,lng:number}|null>(null);
  const [estimate, setEstimate] = useState<any>(null);
  const [ride, setRide] = useState<any>(null);
  const [driverLoc, setDriverLoc] = useState<any>(null);
  const [payChoice, setPayChoice] = useState<'ECOCASH'|'CARD'|null>(null);
  const [ecocashPhone, setEcocashPhone] = useState<string>('');
  const [intent, setIntent] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  useEffect(()=>{ (async()=>{
    const { status } = await Location.requestForegroundPermissionsAsync();
    if(status === 'granted'){
      const loc = await Location.getCurrentPositionAsync({});
      setRegion(r=>({ ...r, latitude: loc.coords.latitude, longitude: loc.coords.longitude }));
      setPickup({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    }
    connectSocket(); // no auth for MVP
  })();
  return ()=>{ disconnectSocket(); }},[]);

  async function onEstimate(){
    if(!pickup || !dropoff) return Alert.alert('Select pickup and dropoff');
    setBusy(true); try{
      const est = await estimateRide(pickup, dropoff);
      setEstimate(est);
    } finally{ setBusy(false); }
  }

  async function onRequest(){
    if(!pickup || !dropoff) return;
    setBusy(true); try{
      const r = await requestRide(pickup, dropoff);
      setRide(r);
      const s = getSocket();
      s?.emit('ride:subscribe', { rideId: r.id });
      s?.on('driver:location', (payload:any)=>{ setDriverLoc(payload); });
      s?.on('ride:status', (payload:any)=>{ setRide((prev:any)=> prev ? { ...prev, status: payload.status } : prev); });
      Alert.alert('Ride requested', `ID: ${r.id.slice(0,8)}`);
    } finally{ setBusy(false); }
  }

  async function onPay(method:'ECOCASH'|'CARD'){
    if(!ride || !estimate) return;
    setPayChoice(method);
    if(method==='ECOCASH'){
      // Show modal to capture phone; call intent when provided
    } else {
      // Create card intent immediately
      setBusy(true);
      try{
        const pi = await createPaymentIntent(ride.id, 'CARD', estimate.estimateCents);
        setIntent(pi);
        if(pi.checkoutUrl){
          // open in external browser (simpler than WebView; webhook will complete status)
          Linking.openURL(pi.checkoutUrl);
        } else {
          Alert.alert('Card payment started', 'Complete checkout in browser.');
        }
      } catch(e:any){ Alert.alert('Error', e.message||'Card intent failed'); }
      finally{ setBusy(false); }
    }
  }

  async function confirmEcoCash(){
    if(!ride || !estimate) return;
    if(!ecocashPhone) return Alert.alert('Enter your EcoCash number (+263...)');
    setBusy(true);
    try{
      const pi = await createPaymentIntent(ride.id, 'ECOCASH', estimate.estimateCents, ecocashPhone);
      setIntent(pi);
      Alert.alert('EcoCash', 'If prompted on your phone, authorise the payment.');
    } catch(e:any){ Alert.alert('Error', e.message||'EcoCash intent failed'); }
    finally{ setBusy(false); setPayChoice(null); }
  }

  // Poll payment intent status (for demo; webhook is the source of truth)
  useEffect(()=>{
    if(!intent?.id) return;
    const t = setInterval(async ()=>{
      try{
        const res = await getPaymentIntent(intent.id);
        setIntent(res);
        const s = res?.status;
        if(s==='SUCCEEDED'){ clearInterval(t); Alert.alert('Payment success','We’ve received your fare.'); }
        if(s==='FAILED'){ clearInterval(t); Alert.alert('Payment failed','Please try another method.'); }
      }catch{}
    }, 5000);
    return ()=>clearInterval(t);
  }, [intent?.id]);

  return (
    <View style={{ flex:1 }}>
      <MapView
        style={{ flex:1 }}
        region={region}
        onRegionChangeComplete={(r)=>setRegion(r)}
        onPress={(e)=>{
          const {latitude, longitude} = e.nativeEvent.coordinate;
          if(!pickup) setPickup({lat: latitude, lng: longitude});
          else setDropoff({lat: latitude, lng: longitude});
        }}
      >
        {pickup && <Marker coordinate={{ latitude: pickup.lat, longitude: pickup.lng }} title="Pickup" />}
        {dropoff && <Marker coordinate={{ latitude: dropoff.lat, longitude: dropoff.lng }} pinColor="blue" title="Dropoff" />}
        {pickup && dropoff && (
          <Polyline coordinates={[{latitude: pickup.lat, longitude: pickup.lng},{latitude: dropoff.lat, longitude: dropoff.lng}]} />
        )}
        {driverLoc && <Marker coordinate={{ latitude: driverLoc.lat, longitude: driverLoc.lng }} pinColor="green" title={`Driver ETA ${driverLoc.etaMin}m`} />}
      </MapView>

      <View style={{ padding:12, backgroundColor:'#fff' }}>
        {!estimate && <Button title="Estimate fare" onPress={onEstimate} />}
        {estimate && !ride && (
          <>
            <Text>Distance: {estimate.distanceKm} km • ETA: {Math.round(estimate.durationMin)} min</Text>
            <Text>Est fare: ${(estimate.estimateCents/100).toFixed(2)} {estimate.currency}</Text>
            <Button title="Request ride" onPress={onRequest} />
          </>
        )}
        {ride && (
          <>
            <Text>Ride: {ride.id.slice(0,8)} • {ride.status}</Text>
            {!intent && (
              <>
                <Button title="Pay with EcoCash" onPress={()=>onPay('ECOCASH')} />
                <View style={{ height:8 }} />
                <Button title="Pay with Card" onPress={()=>onPay('CARD')} />
              </>
            )}
            {intent && <Text>Payment: {intent.status}</Text>}
          </>
        )}
        {busy && <ActivityIndicator />}
      </View>

      {/* EcoCash phone modal */}
      <Modal visible={payChoice==='ECOCASH'} transparent animationType="slide" onRequestClose={()=>setPayChoice(null)}>
        <View style={{ flex:1, backgroundColor:'#0007', alignItems:'center', justifyContent:'center' }}>
          <View style={{ backgroundColor:'#fff', padding:16, borderRadius:8, width:'90%' }}>
            <Text>Enter EcoCash number (+263…)</Text>
            <TextInput keyboardType="phone-pad" placeholder="+2637..." value={ecocashPhone} onChangeText={setEcocashPhone}
              style={{ borderWidth:1, borderColor:'#ccc', padding:8, borderRadius:6, marginVertical:12 }} />
            <Button title="Confirm" onPress={confirmEcoCash} />
            <View style={{ height:8 }} /><Button title="Cancel" onPress={()=>setPayChoice(null)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}
