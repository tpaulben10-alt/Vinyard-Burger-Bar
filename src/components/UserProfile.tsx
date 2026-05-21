import React, { useState } from 'react';
import { User } from '../types';
import { MapPin, Award, UserCheck, Edit3, Check, Globe, RefreshCcw, Landmark, Maximize2, Minimize2 } from 'lucide-react';
import { APIProvider, Map, AdvancedMarker, Pin, useMap } from '@vis.gl/react-google-maps';
import AnimatedHQMarker from './AnimatedHQMarker';

interface UserProfileProps {
  currentUser: User;
  onProfileUpdate: (updatedUser: User) => void;
}

const MAPS_API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  '';

const isMapKeyConfigured = Boolean(MAPS_API_KEY) && MAPS_API_KEY !== 'YOUR_API_KEY';

export default function UserProfile({ currentUser, onProfileUpdate }: UserProfileProps) {
  const [name, setName] = useState(currentUser.name);
  const [address, setAddress] = useState(currentUser.address || '');
  const [lat, setLat] = useState(currentUser.lat || 10.3971559);
  const [lng, setLng] = useState(currentUser.lng || 125.1983495);
  
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !address) {
      setErrorMsg('Full Name and Delivery Address are required.');
      return;
    }
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          name: name.trim(),
          address: address.trim(),
          lat,
          lng
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update profile settings.');
      }

      setSuccessMsg('Profile settings and coordinates saved successfully!');
      onProfileUpdate(data.user);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving user details.');
    } finally {
      setIsLoading(false);
    }
  };

  // Preset location coordinate templates around Hinunangan for easy simulation
  const HINUNANGAN_PRESETS = [
    { label: "Catmonan HQ Office", lat: 10.3971559, lng: 125.1983495, desc: "Catmonan St., Hinunangan" },
    { label: "Poblacion Central Plaza", lat: 10.395340, lng: 125.201200, desc: "Rizal St., Poblacion, Hinunangan" },
    { label: "San Isidro Beach Road", lat: 10.402120, lng: 125.194500, desc: "San Isidro, Hinunangan" },
    { label: "Talisay Coastal Drive", lat: 10.389500, lng: 125.204800, desc: "Talisay Shoreline, Hinunangan" }
  ];

  const handleSelectPreset = (p: typeof HINUNANGAN_PRESETS[0]) => {
     setAddress(p.desc);
     setLat(p.lat);
     setLng(p.lng);
  };

  const hqCoords = { lat: 10.3971559, lng: 125.1983495 };

  // Helper to fit map bounds to multiple coordinates with movement threshold and zoom constraints
  function MapAutoFit({ locations }: { locations: google.maps.LatLngLiteral[] }) {
    const map = useMap();
    const prevLocationsRef = React.useRef<google.maps.LatLngLiteral[]>([]);
    
    // SIGNIFICANT_THRESHOLD in degrees (approx 10-11 meters)
    const SIGNIFICANT_THRESHOLD = 0.0001;

    const hasSignificantlyChanged = (newLocs: google.maps.LatLngLiteral[], oldLocs: google.maps.LatLngLiteral[]) => {
      if (newLocs.length !== oldLocs.length) return true;
      for (let i = 0; i < newLocs.length; i++) {
        const dLat = Math.abs(newLocs[i].lat - oldLocs[i].lat);
        const dLng = Math.abs(newLocs[i].lng - oldLocs[i].lng);
        if (dLat > SIGNIFICANT_THRESHOLD || dLng > SIGNIFICANT_THRESHOLD) return true;
      }
      return false;
    };

    React.useEffect(() => {
      if (!map || locations.length === 0) return;
      
      const shouldUpdate = hasSignificantlyChanged(locations, prevLocationsRef.current);
      if (!shouldUpdate) return;

      prevLocationsRef.current = locations;

      const bounds = new google.maps.LatLngBounds();
      locations.forEach(loc => bounds.extend(loc));
      
      map.fitBounds(bounds, {
        top: 50,
        right: 50,
        bottom: 50,
        left: 50
      });

      // Enforce zoom constraints [14, 17]
      const listener = google.maps.event.addListenerOnce(map, 'idle', () => {
        const zoom = map.getZoom() || 14;
        if (zoom < 14) map.setZoom(14);
        if (zoom > 17) map.setZoom(17);
      });

      return () => google.maps.event.removeListener(listener);
    }, [map, JSON.stringify(locations)]);
    return null;
  }

  // Manual Recenter Control
  function RecenterControl({ locations }: { locations: google.maps.LatLngLiteral[] }) {
    const map = useMap();
    const handleRecenter = () => {
      if (!map || locations.length === 0) return;
      const bounds = new google.maps.LatLngBounds();
      locations.forEach(loc => bounds.extend(loc));
      map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
      const listener = google.maps.event.addListenerOnce(map, 'idle', () => {
        if (map.getZoom()! > 16) map.setZoom(16);
      });
    };

    return (
      <button
        onClick={handleRecenter}
        type="button"
        className="absolute bottom-4 right-4 z-40 bg-white/90 backdrop-blur-sm hover:bg-white text-brand-green p-2 rounded-lg shadow-xl border border-gray-200 transition-all flex items-center justify-center hover:scale-110 active:scale-90 group"
        title="Recenter Map View"
      >
        <RefreshCcw className="w-4 h-4 text-brand-orange group-hover:rotate-180 transition-transform duration-700" />
      </button>
    );
  }


  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      
      {/* Header title */}
      <div>
        <span className="font-mono text-xs uppercase text-brand-orange font-bold tracking-widest block">PERSONAL PREVIEW</span>
        <h1 className="font-serif text-3xl font-bold text-brand-green">Manage Your Account</h1>
        <p className="text-gray-500 font-sans text-sm mt-1">Review your loyalty points balance, registered credentials, and geographic coordinates.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        {/* Left column - details & loyalty rewards */}
        <div className="md:col-span-5 space-y-6">
          
          {/* Identity summary banner */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-brand-green text-white rounded-full flex items-center justify-center font-serif text-xl font-bold uppercase select-none">
                {currentUser.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-brand-green">{currentUser.name}</h3>
                <span className="text-xs font-mono px-2 py-0.5 rounded uppercase font-bold tracking-widest text-[#ffa457] bg-[#914c00]/10 border border-[#ffa457]/10 inline-block mt-0.5">
                  {currentUser.role} Account
                </span>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-3 space-y-1.5 font-mono text-xs text-gray-400">
              <p>ID: <span className="text-gray-600 font-semibold">{currentUser.id}</span></p>
              <p>Email: <span className="text-gray-600 font-semibold">{currentUser.email}</span></p>
              <p>Status: <span className="text-emerald-600 font-bold">● Active Online</span></p>
            </div>
          </div>

          {/* Loyalty balance tracker */}
          <div className="bg-gradient-to-br from-brand-orange/5 to-amber-500/10 border border-brand-orange/15 rounded-xl p-6 space-y-4 shadow-sm relative overflow-hidden">
            <div className="absolute -bottom-6 -right-6 text-[#914c00]/10 select-none">
              <Award className="w-28 h-28" />
            </div>

            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-brand-orange" />
              <h4 className="font-serif text-base font-bold text-brand-green">Rewards Program Balance</h4>
            </div>

            <div className="space-y-1 relative z-10">
              <span className="block text-[11px] font-mono text-gray-500 uppercase tracking-widest font-bold">CURRENT CREDITS</span>
              <span className="text-3xl font-mono font-black text-brand-green">⭐️ {currentUser.loyaltyPoints} PTS</span>
            </div>

            <div className="border-t border-brand-orange/20 pt-4 space-y-2 relative z-10 text-xs leading-relaxed text-zinc-600">
              <p>
                Estimated Value: <strong className="text-brand-orange font-mono">₱{(currentUser.loyaltyPoints).toFixed(2)}</strong>
              </p>
              <p>
                Every ₱10 checkout awards <strong>1 point</strong>. Redeem credits instantly as dynamic discounts during checkout!
              </p>
            </div>
          </div>
        </div>

        {/* Right column - Delivery Form & Map Settings */}
        <form onSubmit={handleUpdate} className="md:col-span-7 bg-white border border-gray-200 rounded-xl p-6 sm:p-8 space-y-6">
          <h2 className="font-serif text-xl font-bold text-brand-green flex items-center gap-2 border-b border-gray-100 pb-3">
            <MapPin className="w-5 h-5 text-brand-orange" /> Deliveries & Coordinates
          </h2>

          {/* Status logs */}
          {successMsg && (
            <div className="p-3 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 text-xs rounded font-medium flex items-center gap-1.5 animate-pulse">
              <Check className="w-4 h-4 text-emerald-600" /> {successMsg}
            </div>
          )}
          {errorMsg && (
            <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs rounded font-medium">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 font-mono">My Display Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 rounded border border-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-orange"
                placeholder="Full Name"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 font-mono">Delivery Address (Manual Input)</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 rounded border border-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-orange font-medium text-brand-green"
                placeholder="Street name, Barangay, Town"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 font-mono">Latitude Coordinate</label>
              <input
                type="number"
                step="any"
                value={lat}
                onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
                className="w-full text-sm font-mono px-3.5 py-2.5 rounded border border-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-orange"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 font-mono">Longitude Coordinate</label>
              <input
                type="number"
                step="any"
                value={lng}
                onChange={(e) => setLng(parseFloat(e.target.value) || 0)}
                className="w-full text-sm font-mono px-3.5 py-2.5 rounded border border-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-orange"
              />
            </div>
          </div>

          {/* Quick Town presets */}
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 font-mono block">Hinunangan Delivery Presets (Click to Load)</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {HINUNANGAN_PRESETS.map((p, i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => handleSelectPreset(p)}
                  className="py-1.5 px-2 bg-zinc-50 hover:bg-zinc-100 border border-gray-200 rounded text-[11px] font-mono hover:text-brand-green text-gray-500 transition cursor-pointer text-left truncate block"
                  title={p.desc}
                >
                  📍 {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive pinpoint map selector */}
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 font-mono block">Deliver PIN mapping locator</span>
            
            <div className={`transition-all duration-300 ${isFullscreen ? 'fixed inset-0 z-[100] bg-white rounded-none border-none' : 'h-56 bg-zinc-100 rounded border border-gray-300 overflow-hidden relative'}`}>
              {isMapKeyConfigured ? (
                <APIProvider apiKey={MAPS_API_KEY} version="weekly">
                  <Map
                    defaultCenter={{ lat, lng }}
                    defaultZoom={15}
                    mapId="USER_PROFILE_DELIVERY_PICK"
                    internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                    style={{ width: '100%', height: '100%' }}
                    onClick={(e) => {
                      if (e.detail.latLng) {
                        setLat(e.detail.latLng.lat);
                        setLng(e.detail.latLng.lng);
                      }
                    }}
                  >
                    {/* Cookhouse HQ Marker */}
                    <AnimatedHQMarker position={hqCoords} title="Vinyard HQ" />

                    {/* Draggable User Pin */}
                    <AdvancedMarker 
                      position={{ lat, lng }} 
                      draggable={true}
                      onDragEnd={(e) => {
                        if (e.latLng) {
                          setLat(e.latLng.lat());
                          setLng(e.latLng.lng());
                        }
                      }}
                    >
                      <Pin background="#ffa457" borderColor="#914c00" glyphColor="#ffffff" />
                    </AdvancedMarker>

                    {/* Auto-fit monitoring */}
                    <MapAutoFit locations={[hqCoords, { lat, lng }]} />

                    {/* Manual Recenter Control */}
                    <RecenterControl locations={[hqCoords, { lat, lng }]} />

                    {/* Fullscreen Toggle */}
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsFullscreen(!isFullscreen);
                      }}
                      className="absolute top-4 right-4 z-40 bg-white/90 backdrop-blur-sm hover:bg-white text-brand-green p-2.5 rounded-lg shadow-xl border border-gray-200 transition-all flex items-center justify-center hover:scale-110 active:scale-95 group/fullscreen"
                      title={isFullscreen ? "Exit Fullscreen" : "Fullscreen View"}
                    >
                      {isFullscreen ? (
                        <Minimize2 className="w-5 h-5 text-brand-orange" />
                      ) : (
                        <Maximize2 className="w-5 h-5 text-brand-orange" />
                      )}
                    </button>
                  </Map>
                </APIProvider>
              ) : (
                <div className="w-full h-full p-4 flex flex-col justify-between bg-zinc-900 text-white relative">
                  <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px] opacity-10"></div>
                  
                  <div className="space-y-1 relative z-10 text-xs">
                    <p className="font-bold text-zinc-300">🗺️ Pinpoint Emulator Placed</p>
                    <p className="font-mono text-[10px] text-zinc-400">Drag/Set custom coordinates directly. Your active checkout coordinates represent the pin position.</p>
                  </div>

                  <div className="bg-brand-green/20 backdrop-blur border border-white/10 p-3 rounded text-[11px] text-zinc-300 space-y-1">
                    <p>🎯 Selected Location Point:</p>
                    <p className="font-mono text-brand-orange-hover">Latitude: {lat.toFixed(6)}, Longitude: {lng.toFixed(6)}</p>
                  </div>
                </div>
              )}
            </div>
            <span className="text-[10px] text-gray-400 font-mono block">★ In production, clicking on map or dragging marker drops the pinpoint instantly!</span>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 bg-brand-green hover:bg-brand-green-hover text-white rounded font-serif font-black transition-all cursor-pointer shadow text-sm uppercase flex items-center justify-center gap-1.5"
          >
            {isLoading ? 'Saving settings...' : 'Save Profile Settings'}
          </button>
        </form>

      </div>
    </div>
  );
}
