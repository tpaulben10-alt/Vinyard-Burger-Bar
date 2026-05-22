import React, { useState, useEffect } from 'react';
import { Order, OrderItem, User } from '../types';
import { MapPin, Award, UserCheck, Edit3, Check, Globe, RefreshCcw, Landmark, Maximize2, Minimize2, History, ShoppingBag, ArrowRight, Clock, ExternalLink, Printer, Filter, ChevronDown, Inbox, ChefHat, Truck, CheckCircle, XCircle, Star } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { APIProvider, Map, AdvancedMarker, Pin, useMap } from '@vis.gl/react-google-maps';
import { motion, AnimatePresence } from 'motion/react';
import AnimatedHQMarker from './AnimatedHQMarker';
import FeedbackForm from './FeedbackForm';
import OrderStatusTimeline from './OrderStatusTimeline';

interface UserProfileProps {
  currentUser: User;
  onProfileUpdate: (updatedUser: User) => void;
  onReorder: (items: OrderItem[]) => void;
  onTrackOrder: (orderId: string) => void;
}

const statusOptions = [
  { value: 'all', label: 'ALL ORDERS', icon: null },
  { value: 'received', label: 'RECEIVED', icon: Inbox },
  { value: 'preparing', label: 'PREPARING', icon: ChefHat },
  { value: 'delivering', label: 'DELIVERING', icon: Truck },
  { value: 'complete', label: 'COMPLETE', icon: CheckCircle },
  { value: 'cancelled', label: 'CANCELLED', icon: XCircle },
];

const sortOptions = [
  { value: 'date', label: 'DATE ORDERED' },
  { value: 'amount', label: 'TOTAL AMOUNT' },
  { value: 'status', label: 'ORDER STATUS' },
];

function CustomDropdown({ 
  value, 
  onChange, 
  options, 
  label, 
  icon: PropIcon 
}: { 
  value: string, 
  onChange: (val: string) => void, 
  options: {value: string, label: string, icon?: any}[], 
  label: string,
  icon?: any
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(o => o.value === value);

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        {label && <span className="text-[10px] font-mono text-gray-400 uppercase font-bold whitespace-nowrap">{label}</span>}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-between gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded text-xs font-mono font-bold text-gray-600 hover:border-brand-orange transition-all min-w-[140px]"
        >
          <div className="flex items-center gap-1.5">
            {PropIcon && <PropIcon className="w-3.5 h-3.5 text-gray-400" />}
            <span className="truncate">{selectedOption?.label}</span>
          </div>
          <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="absolute left-0 sm:right-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden min-w-full sm:min-w-[180px]"
            >
              <div className="py-1">
                {options.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-xs font-mono font-bold transition-colors flex items-center justify-between gap-2 ${
                      value === opt.value 
                        ? 'bg-brand-orange/5 text-brand-orange' 
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                       {opt.icon && <opt.icon className="w-3.5 h-3.5" />}
                       {opt.label}
                    </div>
                    {value === opt.value && <Check className="w-3 h-3" />}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

const MAPS_API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  '';

const isMapKeyConfigured = Boolean(MAPS_API_KEY) && MAPS_API_KEY !== 'YOUR_API_KEY';

export default function UserProfile({ currentUser, onProfileUpdate, onReorder, onTrackOrder }: UserProfileProps) {
  const [name, setName] = useState(currentUser.name);
  const [address, setAddress] = useState(currentUser.address || '');
  const [lat, setLat] = useState(currentUser.lat || 10.3971559);
  const [lng, setLng] = useState(currentUser.lng || 125.1983495);
  
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [orderToPrint, setOrderToPrint] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [lastPrintedTimestamps, setLastPrintedTimestamps] = useState<Record<string, string>>({});
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const handlePrint = (order: Order) => {
    setOrderToPrint(order);
    
    // Update last printed timestamp
    setLastPrintedTimestamps(prev => ({
      ...prev,
      [order.id]: new Date().toISOString()
    }));

    // Wait for the DOM element to be rendered before triggering print
    setTimeout(() => {
      window.print();
      // Reset after print dialog closes/is handled
      setTimeout(() => setOrderToPrint(null), 500);
    }, 50);
  };

  // Order history states
  const [orderHistory, setOrderHistory] = useState<Order[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`/api/orders?userId=${currentUser.id}`);
        if (res.ok) {
          const data = await res.json();
          // Sort by date descending
          setOrderHistory(data.sort((a: Order, b: Order) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          ));
        }
      } catch (e) {
        console.error("Failed to fetch order history", e);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    fetchHistory();
  }, [currentUser.id]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !address) {
      setErrorMsg('Full Name and Delivery Address are required.');
      return;
    }

    // Validation logic for address format
    if (address.trim().length < 10) {
      setErrorMsg('Please provide a more detailed delivery address (at least 10 characters).');
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

  const sortedAndFilteredOrders = orderHistory
    .filter(order => {
      if (statusFilter === 'all') return true;
      return order.status === statusFilter;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortBy === 'amount') {
        comparison = a.total - b.total;
      } else if (sortBy === 'status') {
        comparison = a.status.localeCompare(b.status);
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

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

      {/* Order History Section */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h2 className="font-serif text-xl font-bold text-brand-green flex items-center gap-2">
              <History className="w-5 h-5 text-brand-orange" /> My Order History
            </h2>
            <span className="text-xs font-mono font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded">
              {sortedAndFilteredOrders.length} {statusFilter !== 'all' ? statusFilter.toUpperCase() : ''} RECORDS
            </span>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <CustomDropdown
              label="Sort By:"
              value={sortBy}
              onChange={setSortBy}
              options={sortOptions}
            />
            
            <button 
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-2 bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors self-end sm:self-auto"
              title={`Order: ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
            >
              <RefreshCcw className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-500 ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
            </button>
  
            <CustomDropdown
              label="Filter:"
              icon={Filter}
              value={statusFilter}
              onChange={setStatusFilter}
              options={statusOptions}
            />
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {isLoadingHistory ? (
            <div className="p-12 flex flex-col items-center justify-center text-gray-400 space-y-3">
              <RefreshCcw className="w-8 h-8 animate-spin opacity-20" />
              <p className="font-mono text-xs uppercase tracking-widest">Retrieving ledger...</p>
            </div>
          ) : sortedAndFilteredOrders.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
                <ShoppingBag className="w-8 h-8 text-gray-200" />
              </div>
              <div className="max-w-xs">
                <h4 className="font-serif text-lg font-bold text-gray-400">No {statusFilter !== 'all' ? statusFilter : ''} Orders Found</h4>
                <p className="text-sm text-gray-400 mt-1">
                  {statusFilter === 'all' 
                    ? "Visit our menu to place your first Vinyard Burger Bar order!" 
                    : `You don't have any orders with status "${statusFilter}" currently.`}
                </p>
              </div>
            </div>
          ) : (
            sortedAndFilteredOrders.map((order) => (
              <div key={order.id} className="transition-colors hover:bg-gray-50/10 group">
                <div 
                  className="p-6 cursor-pointer select-none"
                  onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`mt-1 w-10 h-10 rounded-lg flex items-center justify-center border transition-transform group-hover:scale-110 ${
                        order.status === 'complete' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                        order.status === 'cancelled' ? 'bg-red-50 border-red-100 text-red-500' :
                        'bg-brand-orange/5 border-brand-orange/10 text-brand-orange'
                      }`}>
                        <ShoppingBag className="w-5 h-5" />
                      </div>
                      
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-bold text-brand-green">#{order.id}</span>
                          
                          <OrderStatusTimeline 
                            status={order.status} 
                            createdAt={order.createdAt} 
                            estimatedMinutes={order.estimatedMinutes} 
                          />

                          <span className="text-[10px] text-gray-400 flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3" /> {new Date(order.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <ChevronDown className={`w-4 h-4 text-gray-300 transition-transform duration-300 ml-auto sm:ml-0 ${expandedOrderId === order.id ? 'rotate-180' : ''}`} />
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-mono font-black text-brand-green">₱{order.total.toFixed(2)}</span>
                          <span className="text-[10px] text-gray-400 font-mono italic">{order.paymentMethod.toUpperCase()}</span>
                          {lastPrintedTimestamps[order.id] && (
                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-100 text-[9px] font-mono text-gray-500 animate-in fade-in slide-in-from-left-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-brand-orange animate-pulse" />
                              LAST PRINTED: {new Date(lastPrintedTimestamps[order.id]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {/* Print Button */}
                      <button
                        onClick={() => handlePrint(order)}
                        className="p-2 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-lg border border-gray-200 transition-all active:scale-95 group/print"
                        title="Print Receipt"
                      >
                        <Printer className="w-4 h-4 group-hover/print:text-brand-orange" />
                      </button>

                      {/* Re-order button */}
                      <button
                        onClick={() => onReorder(order.items)}
                        className="px-4 py-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                      >
                        <RefreshCcw className="w-3.5 h-3.5" /> Repeat Order
                      </button>
                      
                      {/* Track/View button */}
                      {order.status !== 'complete' && order.status !== 'cancelled' ? (
                        <button
                          onClick={() => onTrackOrder(order.id)}
                          className="px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-md active:scale-95"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Track Now
                        </button>
                      ) : (
                        <button
                          disabled
                          className="px-4 py-2 bg-gray-100 text-gray-400 rounded-lg text-xs font-bold border border-gray-200 flex items-center gap-1.5 opacity-50 cursor-not-allowed"
                        >
                          Archived
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {expandedOrderId === order.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="overflow-hidden bg-gray-50/50"
                    >
                      <div className="px-6 pb-6 pt-2 border-t border-gray-100">
                        <div className="space-y-4">
                          <h4 className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <div className="w-1 h-1 bg-brand-orange rounded-full" /> Detailed Item Breakdown
                          </h4>
                          <div className="space-y-3">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-start text-xs border-b border-gray-100/50 pb-2 last:border-0 last:pb-0">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-black text-brand-green w-6 h-6 rounded bg-brand-green/5 flex items-center justify-center text-[10px]">{item.qty}x</span>
                                    <span className="font-bold text-gray-700">{item.name}</span>
                                  </div>
                                  {item.customizations && Object.entries(item.customizations).length > 0 && (
                                    <div className="ml-8 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                                      {Object.entries(item.customizations).map(([key, val]) => (
                                        <div key={key} className="flex items-center gap-1.5">
                                          <span className="text-[9px] font-mono text-gray-400 uppercase">{key}:</span>
                                          <span className="text-[10px] font-medium text-gray-600">{val as string}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <span className="font-mono font-bold text-brand-green">₱{(item.price * item.qty).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>

                          {order.status === 'complete' && !(order as any).rating && (
                            <FeedbackForm orderId={order.id} />
                          )}

                          <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-gray-200">
                            <div className="space-y-1">
                              <span className="text-[10px] font-mono text-gray-400 uppercase block">Delivery Address</span>
                              <p className="text-xs text-gray-600 font-medium">{address}</p>
                            </div>
                            <div className="text-right space-y-1">
                              <div className="flex justify-between text-[10px] font-mono text-gray-400 uppercase">
                                <span>Subtotal</span>
                                <span>₱{order.subtotal.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-[10px] font-mono text-gray-400 uppercase">
                                <span>Delivery</span>
                                <span>₱{order.deliveryFee.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-xs font-mono font-black text-brand-green border-t border-gray-200 pt-1 mt-1">
                                <span>Total</span>
                                <span>₱{order.total.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Hidden Print Receipt Template */}
      {orderToPrint && (
        <div id="print-receipt" className="hidden print:block p-8 bg-white font-mono text-sm max-w-[80mm] mx-auto border border-dashed border-gray-300">
          <div className="text-center space-y-2 mb-6">
            <div className="flex justify-center mb-4">
              <img 
                src="/src/assets/images/burger_receipt_logo_1779429465772.png" 
                alt="Vinyard Burger Bar Receipt Logo" 
                className="w-16 h-16 object-contain grayscale contrast-200"
                referrerPolicy="no-referrer"
              />
            </div>
            <h1 className="font-serif text-xl font-bold uppercase">Vinyard Burger Bar</h1>
            <p className="text-[10px]">Hinunangan, Southern Leyte</p>
            <p className="text-[10px]">EST. 2020</p>
            <div className="border-b border-dashed border-gray-300 my-2"></div>
            <h2 className="font-bold">OFFICIAL RECEIPT</h2>
            <p className="text-[10px]">{new Date(orderToPrint.createdAt).toLocaleString()}</p>
          </div>

          <div className="space-y-1 mb-4">
            <p className="flex justify-between"><span>ORDER ID:</span> <span>#{orderToPrint.id}</span></p>
            <p className="flex justify-between"><span>CUSTOMER:</span> <span className="uppercase">{orderToPrint.customerName}</span></p>
            <p className="flex justify-between"><span>PAYMENT:</span> <span className="uppercase">{orderToPrint.paymentMethod}</span></p>
          </div>

          <div className="border-t border-b border-dashed border-gray-300 py-2 mb-4">
            <div className="flex justify-between font-bold mb-1">
              <span>ITEM</span>
              <span>QTY</span>
              <span>TOTAL</span>
            </div>
            {orderToPrint.items.map((item, idx) => (
              <div key={idx} className="flex justify-between text-[11px] mb-1">
                <div className="flex flex-col">
                  <span>{item.name}</span>
                  {item.customizations && Object.entries(item.customizations).map(([k, v]) => (
                    <span key={k} className="text-[9px] opacity-70 ml-2">- {k}: {v as string}</span>
                  ))}
                </div>
                <span>{item.qty}x</span>
                <span>₱{(item.price * item.qty).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="space-y-1 mb-6">
            <p className="flex justify-between"><span>SUBTOTAL:</span> <span>₱{orderToPrint.subtotal.toFixed(2)}</span></p>
            <p className="flex justify-between"><span>DELIVERY FEE:</span> <span>₱{orderToPrint.deliveryFee.toFixed(2)}</span></p>
            <p className="flex justify-between font-bold text-lg pt-2 border-t-2 border-black mt-4">
              <span>GRAND TOTAL:</span> 
              <span>₱{orderToPrint.total.toFixed(2)}</span>
            </p>
          </div>

          <div className="text-center space-y-2 mt-8 opacity-50">
            <p className="text-[10px]">Thank you for your patronage!</p>
            <p className="text-[10px]">Freshness. Quality. Vinyard.</p>
            <div className="mt-4 flex justify-center">
              <QRCodeSVG 
                value={JSON.stringify({ 
                  orderId: orderToPrint.id, 
                  total: orderToPrint.total,
                  items: orderToPrint.items.map(i => ({ name: i.name, qty: i.qty }))
                })}
                size={80}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
