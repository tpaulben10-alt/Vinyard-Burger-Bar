import React, { useState, useEffect } from 'react';
import { Order, User, Feedback } from '../types';
import { Truck, CheckCircle, Clock, Star, Gift, ShoppingBag, ShieldAlert, Navigation2, FileText, Send, Check, RefreshCcw, Maximize2, Minimize2 } from 'lucide-react';
import { APIProvider, Map, AdvancedMarker, Pin, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import AnimatedHQMarker from './AnimatedHQMarker';

interface OrderTrackerProps {
  currentUser: User | null;
  onRefreshUser: (user: User) => void;
  trackOrderId?: string | null;
  clearTrackOrderId?: () => void;
}

const MAPS_API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  '';

const isMapKeyConfigured = Boolean(MAPS_API_KEY) && MAPS_API_KEY !== 'YOUR_API_KEY';

// Auxiliary Route Display component using the genuine Google Directions Service API
function RouteRouteDisplay({ origin, destination, onRouteCalculated }: {
  origin: google.maps.LatLngLiteral;
  destination: google.maps.LatLngLiteral;
  onRouteCalculated: (data: {
    distanceMeters: number;
    durationMillis: number;
    staticDurationMillis: number;
    via?: string;
  }) => void;
}) {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const polylinesRef = React.useRef<google.maps.Polyline[]>([]);
  const onRouteCalculatedRef = React.useRef(onRouteCalculated);

  useEffect(() => {
    onRouteCalculatedRef.current = onRouteCalculated;
  }, [onRouteCalculated]);

  useEffect(() => {
    if (!routesLib || !map) return;
    // Clear old routes
    polylinesRef.current.forEach(p => p.setMap(null));

    const directionsService = new google.maps.DirectionsService();

    directionsService.route({
      origin: origin,
      destination: destination,
      travelMode: google.maps.TravelMode.DRIVING,
      drivingOptions: {
        departureTime: new Date(),
        trafficModel: google.maps.TrafficModel.BEST_GUESS
      }
    }, (result, status) => {
      if (status === google.maps.DirectionsStatus.OK && result && result.routes?.[0]) {
        const route = result.routes[0];
        const leg = route.legs?.[0];
        if (leg) {
          const path = leg.steps.flatMap(step => step.path);
          const polyline = new google.maps.Polyline({
            path: path,
            strokeColor: '#ffa457',
            strokeOpacity: 0.8,
            strokeWeight: 6,
            map: map
          });
          polylinesRef.current = [polyline];

          if (route.bounds) {
            map.fitBounds(route.bounds);
          }

          const distanceMeters = leg.distance?.value || 0;
          const durationSeconds = leg.duration_in_traffic?.value || leg.duration?.value || 0;
          const staticDurationSeconds = leg.duration?.value || 0;

          onRouteCalculatedRef.current({
            distanceMeters,
            durationMillis: durationSeconds * 1000,
            staticDurationMillis: staticDurationSeconds * 1000,
            via: route.summary || ''
          });
        }
      } else {
        // Fallback to computeRoutes if DirectionsService suffers client-side limitations
        routesLib.Route.computeRoutes({
          origin,
          destination,
          travelMode: 'DRIVING',
          routingPreference: 'TRAFFIC_AWARE',
          fields: ['path', 'distanceMeters', 'durationMillis', 'staticDurationMillis', 'viewport'],
        }).then(({ routes }) => {
          if (routes?.[0]) {
            const route = routes[0];
            const newPolylines = route.createPolylines();
            newPolylines.forEach(p => p.setMap(map));
            polylinesRef.current = newPolylines;
            if (route.viewport) map.fitBounds(route.viewport);

            onRouteCalculatedRef.current({
              distanceMeters: route.distanceMeters || 0,
              durationMillis: route.durationMillis || 0,
              staticDurationMillis: route.staticDurationMillis || route.durationMillis || 0,
            });
          }
        }).catch(err => {
          console.warn("Both Directions API and Routes API fallback calculations failed", err);
        });
      }
    });

    return () => polylinesRef.current.forEach(p => p.setMap(null));
  }, [routesLib, map, origin.lat, origin.lng, destination.lat, destination.lng]);

  return null;
}

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
      className="absolute bottom-4 right-4 z-40 bg-white/90 backdrop-blur-sm hover:bg-white text-brand-green p-2 rounded-lg shadow-xl border border-gray-200 transition-all flex items-center justify-center hover:scale-110 active:scale-90 group"
      title="Recenter Map View"
    >
      <RefreshCcw className="w-4 h-4 text-brand-orange group-hover:rotate-180 transition-transform duration-700" />
    </button>
  );
}

export default function OrderTracker({ currentUser, onRefreshUser, trackOrderId, clearTrackOrderId }: OrderTrackerProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Rating states
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [ratingSuccess, setRatingSuccess] = useState(false);

  // Dynamic Google Maps Routing data
  const [routeInfo, setRouteInfo] = useState<{
    distanceMeters: number;
    durationMillis: number;
    staticDurationMillis: number;
    via?: string;
  } | null>(null);

  const handleRouteCalculated = React.useCallback((data: {
    distanceMeters: number;
    durationMillis: number;
    staticDurationMillis: number;
    via?: string;
  }) => {
    setRouteInfo(prev => {
      if (
        prev &&
        prev.distanceMeters === data.distanceMeters &&
        prev.durationMillis === data.durationMillis &&
        prev.staticDurationMillis === data.staticDurationMillis &&
        prev.via === data.via
      ) {
        return prev;
      }
      return data;
    });
  }, []);

  // Poll orders database to handle real-time POS modifications instantly
  useEffect(() => {
    if (!currentUser) return;

    const fetchOrders = () => {
      fetch(`/api/orders?userId=${currentUser.id}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setOrders(data);
            if (data.length > 0) {
              // Standard auto-select the latest order
              if (activeOrder) {
                const refreshed = data.find(o => o.id === activeOrder.id);
                if (refreshed) setActiveOrder(refreshed);
              } else {
                setActiveOrder(data[0]);
              }
            } else {
              setActiveOrder(null);
            }
          }
        })
        .catch(err => console.error("Could not fetch active order status queue", err));
    };

    fetchOrders();
    const interval = setInterval(fetchOrders, 4000); // Poll every 4 seconds for immediate administrative updates
    return () => clearInterval(interval);
  }, [currentUser, activeOrder?.id]);

  // Handle cross-tab or cross-screen navigation to a specific order
  useEffect(() => {
    if (trackOrderId && orders.length > 0) {
      const target = orders.find(o => o.id === trackOrderId);
      if (target) {
        setActiveOrder(target);
        if (clearTrackOrderId) clearTrackOrderId();
      }
    }
  }, [trackOrderId, orders, clearTrackOrderId]);

  const handleSelectOrder = (order: Order) => {
    setActiveOrder(order);
    setRating(5);
    setComment('');
    setRatingSuccess(false);
    setRouteInfo(null);
  };

  const submitRating = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrder) return;
    setIsSubmittingRating(true);

    try {
      const res = await fetch(`/api/orders/${activeOrder.id}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment })
      });

      if (!res.ok) {
        throw new Error('Could not record feedback');
      }

      setRatingSuccess(true);
      // Update local view
      setActiveOrder(prev => prev ? { ...prev, rating, feedback: comment } : null);
      
      // Update user points as they gain another rewards bump for feedback!
      if (currentUser) {
        onRefreshUser({
          ...currentUser,
          loyaltyPoints: currentUser.loyaltyPoints + 15 // bonus points for review!
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingRating(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <ShieldAlert className="w-16 h-16 text-brand-orange mx-auto animate-pulse" />
        <h2 className="font-serif text-2xl font-bold text-brand-green">Authentication Needed</h2>
        <p className="text-gray-500 font-sans text-sm">Please sign in or create an account to view and track your burger orders.</p>
      </div>
    );
  }

  // Define steps
  const steps = [
    { label: 'Received', key: 'received', desc: 'Sizzling order placed in queue' },
    { label: 'Cookhouse Prep', key: 'preparing', desc: 'Buns warming, premium patties smash griddled' },
    { label: 'En-Route', key: 'delivering', desc: 'Dispatched for localized address delivery' },
    { label: 'Served', key: 'complete', desc: 'Burger bar cravings satisfied' }
  ];

  const getStepIndex = (status: string) => {
    if (status === 'received') return 0;
    if (status === 'preparing') return 1;
    if (status === 'delivering' || status === 'ready') return 2;
    if (status === 'complete') return 3;
    return -1;
  };

  // Determine current HQ coordinates
  const hqCoords = { lat: 10.3971559, lng: 125.1983495 };
  const destCoords = { 
    lat: activeOrder?.lat || currentUser.lat || 10.3971559, 
    lng: activeOrder?.lng || currentUser.lng || 125.1983495 
  };

  // Haversine helper to calculate straight-line physical distance in kilometers
  const getHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in km
  };

  // Kitchen preparation time buffer based on active cookhouse progress and item complexity
  const getPrepTime = (status: string, items: any[] = []) => {
    if (status === 'ready' || status === 'delivering' || status === 'complete') return 0;
    if (!items || items.length === 0) {
      if (status === 'received') return 12;
      if (status === 'preparing') return 6;
      return 0;
    }

    const getPrepTimePerUnit = (id: string, name: string): number => {
      const lowercaseId = id.toLowerCase();
      const lowercaseName = name.toLowerCase();
      if (lowercaseId.startsWith('burger') || lowercaseName.includes('burger')) {
        return 8;
      } else if (lowercaseId.startsWith('pasta') || lowercaseName.includes('pasta') || lowercaseName.includes('spaghetti') || lowercaseName.includes('carbonara') || lowercaseName.includes('fettuccine')) {
        return 12;
      } else if (lowercaseId.startsWith('chicken') || lowercaseName.includes('chicken') || lowercaseName.includes('wings')) {
        return 12;
      } else if (lowercaseId.startsWith('rice') || lowercaseName.includes('rice') || lowercaseName.includes('steak')) {
        return 10;
      } else if (lowercaseId.startsWith('sides') || lowercaseName.includes('fries') || lowercaseName.includes('wedges') || lowercaseName.includes('rings') || lowercaseName.includes('nachos') || lowercaseName.includes('onion')) {
        return 5;
      } else if (lowercaseId.startsWith('drinks') || lowercaseName.includes('iced') || lowercaseName.includes('latte') || lowercaseName.includes('soda') || lowercaseName.includes('lemonade') || lowercaseName.includes('coffee') || lowercaseName.includes('tea') || lowercaseName.includes('beverage')) {
        return 2;
      }
      return 7;
    };

    const totalItemCount = items.reduce((sum, item) => sum + (item.qty || 1), 0);
    const maxSinglePrepTime = Math.max(...items.map(item => getPrepTimePerUnit(item.menuItemId || item.id || '', item.name || '')));
    const additionalQtyPrep = Math.max(0, totalItemCount - 1) * 1.5;
    const fullPrepTime = maxSinglePrepTime + additionalQtyPrep;

    if (status === 'preparing') {
      return Math.max(3, Math.round(fullPrepTime * 0.5));
    }
    return Math.round(fullPrepTime);
  };

  // Extract driving parameters from active Google Maps routing state
  const driveMinutes = routeInfo ? (routeInfo.durationMillis / 60000) : null;
  const staticDriveMinutes = routeInfo ? (routeInfo.staticDurationMillis / 60000) : null;
  const distanceKm = routeInfo ? (routeInfo.distanceMeters / 1000) : null;

  // Set up solid physics fallback mock-ups for local sandbox environments
  const simulatedDistance = getHaversineDistance(hqCoords.lat, hqCoords.lng, destCoords.lat, destCoords.lng);
  const simulatedBaseDriveMins = simulatedDistance * (60 / 35); // 35 km/h average speed in small town roads
  
  // Seed physical traffic variations based on Order ID hash and current minute
  const orderHash = activeOrder ? activeOrder.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 0;
  const currentMinute = new Date().getMinutes();
  const trafficFactor = 1.0 + ((orderHash + currentMinute) % 4) * 0.12; // 1.0 to 1.36 multiplier
  const simulatedTrafficMins = simulatedBaseDriveMins * trafficFactor;

  // Unify Google Maps dynamic metrics and high-fidelity physics fallback parameters
  const activeDistance = distanceKm !== null ? distanceKm : simulatedDistance;
  const activeDriveMins = driveMinutes !== null ? driveMinutes : simulatedTrafficMins;
  const activeStaticMins = staticDriveMinutes !== null ? staticDriveMinutes : simulatedBaseDriveMins;
  const activePrepMins = activeOrder ? getPrepTime(activeOrder.status, activeOrder.items) : 0;

  // Calculate final cumulative arrival time windows
  const calculatedTotalEta = activePrepMins + activeDriveMins;
  const trafficDelayMins = Math.max(0, activeDriveMins - activeStaticMins);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      
      {/* Search selection toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <span className="font-mono text-xs uppercase text-brand-orange font-bold tracking-widest block">PIPELINE MONITOR</span>
          <h1 className="font-serif text-3xl font-bold text-brand-green">Live Cookhouse Tracker</h1>
        </div>

        {orders.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-gray-500">Track Order ID:</span>
            <select
              value={activeOrder?.id || ''}
              onChange={(e) => {
                const match = orders.find(o => o.id === e.target.value);
                if (match) handleSelectOrder(match);
              }}
              className="text-xs font-mono font-bold bg-white text-brand-green border border-gray-300 py-1.5 px-3 rounded cursor-pointer leading-tight focus:outline-none"
            >
              {orders.map(o => (
                <option key={o.id} value={o.id}>
                  {o.id} ({o.items.reduce((acc, x) => acc + x.qty, 0)} items)
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {orders.length === 0 ? (
        <div className="py-16 text-center space-y-4 bg-white border border-gray-200 rounded-xl max-w-lg mx-auto p-8 shadow-sm">
          <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto" />
          <h2 className="font-serif text-xl font-bold text-brand-green">No Orders Logged</h2>
          <p className="text-xs text-gray-400 font-sans max-w-sm mx-auto leading-relaxed">
            You haven't logged any food orders on your account yet. Let's head over to the Cookhouse Catalog and select your burger feast!
          </p>
        </div>
      ) : activeOrder && (() => {
        const isCounterPickup = activeOrder.paymentMethod === 'counter' || activeOrder.address === 'Counter Pick-up';
        return (
        <div className="space-y-6">
          {/* Prominent Google Maps Directions Dynamic Traffic-Aware ETA Header */}
          {!isCounterPickup && activeOrder.status !== 'complete' && activeOrder.status !== 'cancelled' && (
            <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 text-white rounded-xl p-6 shadow-lg border border-zinc-700 relative overflow-hidden flex flex-col md:flex-row justify-between items-stretch gap-6 text-left">
              {/* Background decorative path pattern */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-[radial-gradient(ellipse_at_top_right,rgba(255,164,87,0.08),transparent)] pointer-events-none rounded-full" />
              
              <div className="space-y-3.5 relative z-10 flex-1 text-left">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-mono uppercase bg-amber-500/15 text-[#ffa457] border border-amber-500/20 tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                    Google Maps Directions Live
                  </span>
                  <span className="text-[10px] text-zinc-400 font-sans">
                    {routeInfo ? "Real-time Traffic Engaged" : "Calculated Road-Network Vector Simulation"}
                  </span>
                </div>

                <div className="space-y-1">
                  <h2 className="text-[11.5px] font-mono uppercase text-zinc-400 tracking-widest font-bold">Traffic-Adjusted Delivery ETA</h2>
                  <div className="flex flex-wrap items-baseline gap-3">
                    <span className="text-4xl md:text-5xl font-mono font-black text-[#ffa457] tracking-tight">
                      ~{Math.ceil(calculatedTotalEta)} Mins
                    </span>
                    <span className="text-xs text-zinc-300 font-sans">
                      (Estimated Arrival Window)
                    </span>
                  </div>
                </div>

                {/* Route progress visual slider */}
                <div className="space-y-1 pt-1 max-w-xl">
                  <div className="flex justify-between text-[9px] font-mono text-zinc-400">
                    <span>Vinyard Kitchen ({activePrepMins}min prep)</span>
                    <span>{activeOrder.address}</span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-700/60 rounded-full overflow-hidden relative border border-zinc-600/30">
                    <div 
                      className="h-full bg-gradient-to-r from-brand-orange to-[#ffa457] transition-all duration-1000"
                      style={{ 
                        width: activeOrder.status === 'received' ? '15%' : activeOrder.status === 'preparing' ? '45%' : '80%'
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-center gap-4 shrink-0 border-t md:border-t-0 md:border-l border-zinc-700/60 pt-4 md:pt-0 md:pl-6">
                <div className="grid grid-cols-2 md:grid-cols-1 gap-x-4 gap-y-2 text-left w-full min-w-[200px]">
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-400 block">Distance Matrix</span>
                    <strong className="text-sm font-mono font-bold text-white">{activeDistance.toFixed(2)} Kilometers</strong>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-400 block">Base Driving Time</span>
                    <strong className="text-sm font-mono font-bold text-white">~{Math.ceil(activeStaticMins)} Mins</strong>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-400 block">Street Route Summary</span>
                    <strong className="text-[11px] font-sans text-brand-orange-hover line-clamp-1">
                      {routeInfo?.via ? `Via ${routeInfo.via}` : "Local Highway/Hinunangan Road Grid"}
                    </strong>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-400 block flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${trafficDelayMins > 1 ? 'bg-red-500' : 'bg-emerald-500'}`} />
                      Traffic Congestion
                    </span>
                    <strong className={`text-xs font-mono block ${trafficDelayMins > 1.5 ? 'text-rose-400' : trafficDelayMins > 0.5 ? 'text-amber-400' : 'text-[#ffa457]'}`}>
                      {trafficDelayMins > 1.5 
                        ? `+${trafficDelayMins.toFixed(1)}m traffic delay` 
                        : trafficDelayMins > 0.5 
                          ? `+${trafficDelayMins.toFixed(1)}m light congestion` 
                          : 'Normal - Free Flowing'
                      }
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Tracker Main Status Board */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* ETA Clock module */}
            <div className="bg-brand-green text-white rounded-xl p-6 relative overflow-hidden shadow-md border border-brand-green-hover flex flex-col sm:flex-row justify-between sm:items-center gap-4 rustic-wood-texture/80">
              <div className="space-y-1 relative z-10 text-left flex-1">
                <span className="font-mono text-[10px] uppercase text-[#ffa457] font-bold tracking-wider">Estimated Delivery Window</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-mono font-black text-white">
                    {activeOrder.status === 'complete' 
                      ? 'Served' 
                      : isCounterPickup
                        ? `~${activePrepMins > 0 ? activePrepMins : 5} Mins`
                        : `~${Math.ceil(calculatedTotalEta)} Mins`
                    }
                  </span>
                  {activeOrder.status !== 'complete' && (
                    <span className="text-xs text-zinc-300 font-sans font-medium">
                      {isCounterPickup ? 'until ready for counter pick-up' : 'remaining until dropoff'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-300 font-sans text-left mt-1">
                  {isCounterPickup ? 'Cookhouse Pick-Up:' : 'Address LockPIN:'} <strong className="text-white">{isCounterPickup ? 'Vinyard Restaurant Main Counter' : activeOrder.address}</strong>
                </p>

                {activeOrder.status !== 'complete' && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-2 border-t border-white/10 mt-2.5 text-xs text-zinc-200">
                    <span className="font-sans flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                      Kitchen Cook Prep: <strong className="text-white font-mono">{activePrepMins} Mins</strong>
                    </span>
                    {!isCounterPickup && (
                      <>
                        <span className="font-sans flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                          Rider driving time: <strong className="text-white font-mono">~{Math.ceil(activeDriveMins)} Mins</strong>
                        </span>
                        <span className="font-sans flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Distance: <strong className="text-white font-mono">{activeDistance.toFixed(1)} km</strong>
                        </span>
                        {trafficDelayMins > 0.5 && (
                          <span className="font-sans flex items-center gap-1 text-[#ffa457] animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#ffa457]" />
                            Traffic: <strong className="font-mono">+{trafficDelayMins.toFixed(1)} Mins delay</strong>
                          </span>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="relative z-10 bg-white/10 px-4 py-3 border border-white/15 rounded flex items-center gap-3 self-start sm:self-auto uppercase tracking-wider font-mono text-xs">
                <Clock className="w-5 h-5 text-brand-orange-hover animate-pulse" />
                <div className="text-left">
                  <p className="text-[10px] text-zinc-500 font-bold font-mono">PIPELINE STAGE</p>
                  <p className="font-bold text-white uppercase">{activeOrder.status}</p>
                </div>
              </div>
            </div>

            {/* Live Routing Traffic Analytics Grid */}
            {activeOrder.status !== 'complete' && !isCounterPickup && (
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs grid grid-cols-1 sm:grid-cols-4 gap-4 text-left animate-fade-in">
                {/* Visual Header */}
                <div className="sm:col-span-4 flex items-center justify-between border-b border-gray-150 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-orange opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-orange"></span>
                    </span>
                    <h3 className="font-serif text-[11px] font-black uppercase text-brand-green tracking-wider">
                      Live Routing Traffic Analytics
                    </h3>
                  </div>
                  <span className="font-mono text-[9px] text-gray-400 capitalize bg-zinc-50 px-2 py-0.5 rounded border border-gray-200">
                    {routeInfo ? "🟢 connected to live maps sdk" : "🟡 local physics simulation"}
                  </span>
                </div>

                {/* Metric 1: Total ETA breakdown */}
                <div className="bg-zinc-50 rounded border border-gray-150 p-3 space-y-1">
                  <p className="text-[9px] font-mono text-gray-400 font-bold uppercase tracking-wider">Estimated Total ETA</p>
                  <p className="text-lg font-mono font-black text-brand-green">
                    ~{Math.ceil(calculatedTotalEta)} Mins
                  </p>
                  <p className="text-[10px] text-zinc-500 font-sans leading-tight">
                    {activePrepMins > 0 ? `Prep (${activePrepMins}m) + Drive (~${Math.ceil(activeDriveMins)}m)` : 'Active Transit Delivery'}
                  </p>
                </div>

                {/* Metric 2: Distance */}
                <div className="bg-zinc-50 rounded border border-gray-150 p-3 space-y-1">
                  <p className="text-[9px] font-mono text-gray-400 font-bold uppercase tracking-wider">Routing Distance</p>
                  <p className="text-lg font-mono font-black text-brand-green">
                    {activeDistance.toFixed(2)} km
                  </p>
                  <p className="text-[10px] text-zinc-500 font-sans leading-tight">
                    From Cookhouse HQ
                  </p>
                </div>

                {/* Metric 3: Traffic Aware Transit */}
                <div className="bg-zinc-50 rounded border border-gray-150 p-3 space-y-1">
                  <p className="text-[9px] font-mono text-gray-400 font-bold uppercase tracking-wider">Street Driving ETA</p>
                  <p className="text-lg font-mono font-black text-brand-green">
                    ~{Math.ceil(activeDriveMins)} Mins
                  </p>
                  <p className="text-[10px] text-zinc-500 font-sans leading-tight">
                    With current traffic delay
                  </p>
                </div>

                {/* Metric 4: Traffic Condition status */}
                <div className="bg-zinc-50 rounded border border-gray-150 p-3 space-y-1">
                  <p className="text-[9px] font-mono text-gray-400 font-bold uppercase tracking-wider">Street Traffic Delay</p>
                  <div className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${
                      trafficDelayMins > 3 
                        ? 'bg-red-500 animate-pulse' 
                        : trafficDelayMins > 1 
                          ? 'bg-amber-500' 
                          : 'bg-emerald-500'
                    }`} />
                    <p className={`text-base font-mono font-bold ${
                      trafficDelayMins > 3 
                        ? 'text-red-700' 
                        : trafficDelayMins > 1 
                          ? 'text-amber-700' 
                          : 'text-emerald-700'
                    }`}>
                      {trafficDelayMins > 0 ? `+${trafficDelayMins.toFixed(1)} Mins` : 'Clear Road'}
                    </p>
                  </div>
                  <p className="text-[10px] text-zinc-500 font-sans leading-tight">
                    {trafficDelayMins > 3 
                      ? "Heavy traffic conditions." 
                      : trafficDelayMins > 1 
                        ? "Moderate congestion." 
                        : "Streets are fully clear!"
                    }
                  </p>
                </div>
              </div>
            )}

            {/* Stepper Visual Interface */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 relative">
                
                {steps.map((step, idx) => {
                  const currIdx = getStepIndex(activeOrder.status);
                  const isFinished = idx < currIdx;
                  const isActive = idx === currIdx;

                  return (
                    <div key={idx} className="flex flex-col items-center text-center space-y-3 shrink-0 relative">
                      
                      {/* Connection node lines */}
                      {idx < 3 && (
                        <div className="hidden sm:block absolute left-1/2 top-5 w-full h-[3px] bg-gray-100 z-0">
                          <div 
                            className={`h-full bg-brand-orange transition-all duration-700 ${
                              isFinished ? 'w-full' : 'w-0'
                            }`} 
                          />
                        </div>
                      )}

                      {/* Dot icon selector */}
                      <div className={`w-11 h-11 rounded-full border-2 flex items-center justify-center relative z-10 transition-all duration-300 ${
                        isFinished 
                          ? 'bg-brand-orange border-[#914c00] text-white shadow-md' 
                          : isActive 
                            ? 'bg-brand-green border-brand-orange text-white animate-pulse shadow-md' 
                            : 'bg-white border-gray-200 text-gray-300'
                      }`}>
                        {isFinished ? (
                          <Check className="w-5 h-5" />
                        ) : (
                          <span className="font-mono text-sm font-bold">{idx + 1}</span>
                        )}
                      </div>

                      <div className="space-y-0.5">
                        <h4 className={`font-serif text-sm font-bold ${
                          isActive ? 'text-brand-green font-black scale-102' : 'text-gray-500'
                        }`}>
                          {step.label}
                        </h4>
                        <p className="text-[10px] text-gray-400 font-sans max-w-[120px] mx-auto leading-tight">{step.desc}</p>
                      </div>
                    </div>
                  );
                })}

              </div>
            </div>

            {/* Live routing and delivery address coordinates mapping */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <div className="flex justify-between items-center bg-zinc-50 p-3 rounded border border-gray-100 font-sans font-semibold text-xs text-brand-green">
                <span className="flex items-center gap-2">
                  <Navigation2 className="w-4 h-4 text-brand-orange animate-spin" />
                  <span>Real-time Router Path Status: {activeOrder.status === 'complete' ? 'Delivered' : 'Active dispatch'}</span>
                </span>
                <span className="font-mono text-[10px] text-gray-400 uppercase">Target: Hinunangan Grid</span>
              </div>

              <div className={`transition-all duration-300 ${isFullscreen ? 'fixed inset-0 z-[100] bg-white rounded-none border-none' : 'h-[280px] bg-zinc-100 rounded overflow-hidden relative border border-gray-200'}`}>
                {isMapKeyConfigured ? (
                  <APIProvider apiKey={MAPS_API_KEY} version="weekly">
                    <Map
                      defaultCenter={hqCoords}
                      defaultZoom={13}
                      mapId="ORDER_TRACKER_DELIVERY_ROUTE"
                      internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                      style={{ width: '100%', height: '100%' }}
                    >
                      {/* Cookhouse HQ marker */}
                      <AnimatedHQMarker position={hqCoords} title="Vinyard HQ Cookhouse" />

                      {/* Customer target marker */}
                      <AdvancedMarker position={destCoords} title="My Delivery Location">
                        <Pin background="#ffa457" borderColor="#914c00" glyphColor="#ffffff" />
                      </AdvancedMarker>

                      {/* Render Routing connector path */}
                      <RouteRouteDisplay 
                        origin={hqCoords} 
                        destination={destCoords} 
                        onRouteCalculated={handleRouteCalculated} 
                      />

                      {/* Auto-fit monitoring to ensure both points are visible even if routing fails */}
                      <MapAutoFit locations={[hqCoords, destCoords]} />
                      
                      {/* Manual Recenter Control */}
                      <RecenterControl locations={[hqCoords, destCoords]} />

                      {/* Fullscreen Toggle */}
                      <button 
                        onClick={() => setIsFullscreen(!isFullscreen)}
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
                    <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] opacity-10"></div>
                    
                    <div className="grid grid-cols-2 gap-4 relative z-10 text-xs text-zinc-300">
                      <div className="p-3 bg-white/5 rounded border border-white/10 space-y-1">
                        <p className="font-serif text-brand-orange font-bold uppercase tracking-wider text-[10px]">Start: Vinyard HQ</p>
                        <p className="font-mono text-[10px] text-zinc-400">Lat: 10.3971559</p>
                        <p className="font-mono text-[10px] text-zinc-400">Lng: 125.1983495</p>
                      </div>
                      <div className="p-3 bg-white/5 rounded border border-white/10 space-y-1">
                        <p className="font-serif text-brand-orange font-bold uppercase tracking-wider text-[10px]">End: Destination</p>
                        <p className="font-mono text-[10px] text-zinc-400">Lat: {destCoords.lat.toFixed(6)}</p>
                        <p className="font-mono text-[10px] text-zinc-400">Lng: {destCoords.lng.toFixed(6)}</p>
                      </div>
                    </div>

                    <div className="bg-brand-green border border-brand-green-hover p-4 rounded text-xs space-y-1.5 relative z-10">
                      <p className="font-bold text-[#ffa457] flex items-center gap-1">📍 Local Carrier Track Simulation</p>
                      <p className="text-[11px] text-zinc-300 leading-relaxed">
                        Routing direct vectors between Vinyard headquarters and your verified profile shipping pin. Map indicators simulation will calculate distance. Perfect for local and remote POS auditing.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Complete Rating Feedback Card */}
            {activeOrder.status === 'complete' && (
              <div className="bg-gradient-to-br from-brand-orange/5 to-amber-500/10 border border-brand-orange/15 rounded-xl p-6 space-y-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-brand-orange fill-brand-orange" />
                    <h3 className="font-serif text-xl font-bold text-brand-green">Rate Your Culinary Experience!</h3>
                  </div>
                  <p className="text-xs text-gray-500">
                    Your burger order has been served. Earn another <strong className="text-brand-orange">15 reward points</strong> by feeding back to the chef!
                  </p>
                </div>

                {activeOrder.rating ? (
                  <div className="p-4 bg-white rounded border border-gray-200 space-y-3">
                    <p className="font-serif text-sm font-bold text-brand-green">My Review Profile:</p>
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`w-4.5 h-4.5 ${
                            i < (activeOrder.rating || 0) 
                              ? 'text-amber-500 fill-amber-500' 
                              : 'text-gray-200'
                          }`} 
                        />
                      ))}
                    </div>
                    <p className="text-xs text-zinc-600 font-sans italic">"{activeOrder.feedback}"</p>
                  </div>
                ) : ratingSuccess ? (
                  <div className="p-4 bg-emerald-50 text-emerald-800 rounded border border-emerald-200 font-mono text-xs font-bold leading-relaxed">
                    ✓ Feedback received. Thank you! 15 Loyalty Club Points credited automatically.
                  </div>
                ) : (
                  <form onSubmit={submitRating} className="space-y-4">
                    <div className="space-y-2">
                      <span className="text-xs font-mono font-bold text-gray-500 block uppercase">Choose Stars Rating</span>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((val) => (
                          <button
                            type="button"
                            key={val}
                            onClick={() => setRating(val)}
                            className="p-1 hover:scale-110 transition active:scale-95 cursor-pointer text-amber-500"
                          >
                            <Star 
                              className={`w-7 h-7 ${
                                val <= rating 
                                  ? 'fill-amber-500 text-amber-500' 
                                  : 'text-gray-300'
                              }`} 
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-xs font-mono font-bold text-gray-500 block uppercase">Review Details (Optional)</span>
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Wow! Best crispy fries and smash patties under the sun, well done!"
                        className="w-full text-xs p-3 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-orange h-20 resize-none font-sans bg-white"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingRating}
                      className="h-10 px-5 bg-brand-green hover:bg-brand-green-hover text-white rounded font-serif text-xs font-bold transition shadow flex items-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      <span>{isSubmittingRating ? 'SUBMITTING...' : 'SUBMIT TESTIMONIAL'}</span>
                    </button>
                  </form>
                )}
              </div>
            )}

          </div>

          {/* Right column - order receipt details */}
          <div className="lg:col-span-4 bg-white border border-gray-200 rounded-xl p-6 space-y-6">
            <h3 className="font-serif text-lg font-bold text-brand-green border-b border-gray-100 pb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-brand-orange" /> Receipt details
            </h3>

            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Order ID:</span>
                <span className="text-brand-green font-bold">{activeOrder.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Logged Time:</span>
                <span>{new Date(activeOrder.createdAt).toLocaleTimeString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Checkout Type:</span>
                <span className="uppercase font-bold">
                  {activeOrder.paymentMethod === 'gcash'
                    ? 'GCash Wallet'
                    : activeOrder.paymentMethod === 'card'
                      ? 'Credit Card'
                      : activeOrder.paymentMethod === 'counter'
                        ? 'Counter Pickup'
                        : 'COD Delivery'}
                </span>
              </div>
            </div>

            <div className="border-t border-dashed border-gray-200 pt-4 space-y-3">
              {activeOrder.items.map((item, id) => (
                <div key={id} className="text-xs space-y-1">
                  <div className="flex justify-between font-serif font-black text-brand-green">
                    <span>{item.qty}x {item.name}</span>
                    <span className="font-mono text-xs text-gray-500">₱{(item.price * item.qty).toFixed(2)}</span>
                  </div>
                  {item.customizations && (
                    <div className="pl-4 font-mono text-[10px] text-gray-400 space-y-0.5">
                      {item.customizations.pattyDone && <p>• Done: {item.customizations.pattyDone}</p>}
                      {item.customizations.noOnions && <p>• No onions</p>}
                      {item.customizations.extraSauce && <p>• Extra sauce</p>}
                      {item.customizations.notes && <p>• Notes: "{item.customizations.notes}"</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="border-t border-gray-200 pt-4 space-y-1.5 font-mono text-xs">
              <div className="flex justify-between text-gray-400">
                <span>Subtotal:</span>
                <span>₱{activeOrder.subtotal.toFixed(2)}</span>
              </div>
              {activeOrder.deliveryFee !== undefined && activeOrder.deliveryFee > 0 && (
                <div className="flex justify-between text-gray-500">
                  <span>Delivery Fee ({activeOrder.distance?.toFixed(2) || '0.00'} km):</span>
                  <span>₱{activeOrder.deliveryFee.toFixed(2)}</span>
                </div>
              )}
              {(() => {
                const calculatedDiscount = (activeOrder.subtotal + (activeOrder.deliveryFee || 0)) - activeOrder.total;
                if (calculatedDiscount > 0.01) {
                  return (
                    <div className="flex justify-between text-[#914c00] font-bold">
                      <span>Loyalty Discount:</span>
                      <span>-₱{calculatedDiscount.toFixed(2)}</span>
                    </div>
                  );
                }
                return null;
              })()}
              <div className="flex justify-between text-sm font-bold text-brand-green pt-1.5 border-t border-gray-100">
                <span>
                  Payment Amount ({
                    activeOrder.paymentMethod === 'gcash'
                      ? 'GCash'
                      : activeOrder.paymentMethod === 'card'
                        ? 'Credit Card'
                        : activeOrder.paymentMethod === 'counter'
                          ? 'Counter'
                          : 'COD'
                  }):
                </span>
                <span>₱{activeOrder.total.toFixed(2)}</span>
              </div>
            </div>

            {activeOrder.status === 'complete' && (
              <div className="border-t border-dashed border-gray-200 pt-4 space-y-3">
                <div className="flex items-center gap-1.5 text-brand-green font-serif font-black text-xs">
                  <Star className="w-4 h-4 text-brand-orange fill-brand-orange" />
                  <span>Order Experience Rating:</span>
                </div>
                {activeOrder.rating ? (
                  <div className="bg-zinc-50 border border-gray-150 rounded p-3 space-y-1.5 text-left">
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`w-3.5 h-3.5 ${
                            i < (activeOrder.rating || 0) 
                              ? 'text-amber-500 fill-amber-500' 
                              : 'text-gray-205'
                          }`} 
                        />
                      ))}
                    </div>
                    {activeOrder.feedback && (
                      <p className="text-[11px] text-gray-500 italic leading-relaxed">"{activeOrder.feedback}"</p>
                    )}
                  </div>
                ) : ratingSuccess ? (
                  <p className="text-[10px] text-emerald-700 font-mono">✓ Feedback recorded successfully!</p>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((val) => (
                        <button
                          type="button"
                          key={val}
                          onClick={() => setRating(val)}
                          className="hover:scale-110 transition active:scale-95 cursor-pointer text-amber-500"
                        >
                          <Star 
                            className={`w-5 h-5 ${
                              val <= rating 
                                ? 'fill-amber-500 text-amber-500' 
                                : 'text-gray-300'
                            }`} 
                          />
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-1.5 items-center">
                      <input
                        type="text"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Add quick comments..."
                        className="flex-1 text-[10px] px-2.5 py-1.5 border border-gray-300 rounded font-sans focus:outline-none focus:ring-1 focus:ring-brand-orange bg-white min-w-0"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          submitRating(e);
                        }}
                        disabled={isSubmittingRating}
                        className="bg-brand-green hover:bg-brand-green-hover text-white text-[10px] font-bold font-serif px-2.5 py-1.5 rounded transition shadow-sm cursor-pointer shrink-0"
                      >
                        {isSubmittingRating ? '...' : 'Rate'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Chronological Status History */}
            <div className="border-t border-dashed border-gray-200 pt-4 space-y-3">
              <div className="flex items-center gap-1.5 text-brand-green font-serif font-black text-xs uppercase tracking-wider-xs">
                <Clock className="w-4 h-4 text-brand-orange" />
                <span>Tracking History</span>
              </div>
              <div className="space-y-3.5 pl-1 ml-0.5 pt-1.5 relative border-l-2 border-dashed border-gray-200">
                {(() => {
                  const history = activeOrder.statusHistory && activeOrder.statusHistory.length > 0
                    ? activeOrder.statusHistory
                    : [{ status: activeOrder.status, timestamp: activeOrder.createdAt }];
                    
                  // Sort chronologically (earliest first)
                  const sortedHistory = [...history].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

                  const getStatusLabelAndColor = (status: string) => {
                    switch (status) {
                      case 'received':
                        return { label: 'Order Received', color: 'bg-blue-500 border-blue-200', text: 'text-blue-700' };
                      case 'preparing':
                        return { label: 'Preparing Cookhouse', color: 'bg-amber-500 border-amber-200', text: 'text-amber-700' };
                      case 'ready':
                        return { label: 'Ready for Pickup', color: 'bg-indigo-500 border-indigo-200', text: 'text-indigo-700' };
                      case 'delivering':
                        return { label: 'En-Route Delivery', color: 'bg-purple-500 border-purple-200', text: 'text-purple-700' };
                      case 'complete':
                        return { label: 'Served & Completed', color: 'bg-emerald-500 border-emerald-200', text: 'text-emerald-700' };
                      case 'cancelled':
                        return { label: 'Order Cancelled', color: 'bg-red-500 border-red-200', text: 'text-red-700' };
                      default:
                        return { label: status, color: 'bg-gray-500 border-gray-200', text: 'text-gray-700' };
                    }
                  };

                  return sortedHistory.map((item, idx) => {
                    const info = getStatusLabelAndColor(item.status);
                    const isLast = idx === sortedHistory.length - 1;
                    return (
                      <div key={idx} className="flex gap-3 items-start relative -left-[7px] z-10 bg-white">
                        <div className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 border-2 ${
                          isLast 
                            ? 'bg-brand-orange border-amber-200 ring-4 ring-brand-orange/10 animate-pulse' 
                            : 'bg-gray-400 border-white'
                        }`} />
                        <div className="flex-1 space-y-0.5 min-w-0">
                          <div className="flex justify-between items-baseline gap-2">
                            <span className={`text-[11px] font-sans font-bold capitalize ${isLast ? 'text-zinc-900' : 'text-gray-400'}`}>
                              {info.label}
                            </span>
                            <span className="text-[9px] font-mono text-gray-400 shrink-0">
                              {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                          </div>
                          <span className="block text-[8.5px] font-mono text-gray-400">
                            {new Date(item.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            <div className="bg-zinc-50 border border-gray-150 rounded p-4 text-center font-mono text-[11px] text-gray-400 uppercase tracking-wider">
              ❤️ Thank you for choosing Vinyard!
            </div>
          </div>

        </div>
        </div>
        );
      })()}

    </div>
  );
}
