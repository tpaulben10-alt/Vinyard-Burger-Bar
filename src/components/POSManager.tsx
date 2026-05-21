import React, { useState, useEffect } from 'react';
import { Order, User, Feedback } from '../types';
import { ShieldCheck, Users, ClipboardList, Star, MapPin, CheckCircle, RefreshCcw, Activity, AlertTriangle, X, Printer, Maximize2, Minimize2 } from 'lucide-react';
import { APIProvider, Map, AdvancedMarker, Pin, useMap } from '@vis.gl/react-google-maps';
import AnimatedHQMarker from './AnimatedHQMarker';

interface POSManagerProps {
  currentUser: User;
}

const MAPS_API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  '';

const isMapKeyConfigured = Boolean(MAPS_API_KEY) && MAPS_API_KEY !== 'YOUR_API_KEY';

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
    
    // Auto-adjust zoom and center to fit all markers
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
  }, [map, JSON.stringify(locations)]); // locString used as stable dependency
  
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


export default function POSManager({ currentUser }: POSManagerProps) {
  const [activeTab, setActiveTab] = useState<'orders' | 'accounts' | 'reviews'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [reviews, setReviews] = useState<Feedback[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Status logs
  const [infoMsg, setInfoMsg] = useState('');

  const loadData = async () => {
    try {
      // 1. Load orders
      const ordersRes = await fetch('/api/orders');
      const ordersData = await ordersRes.json();
      if (Array.isArray(ordersData)) {
        setOrders(ordersData);
        if (ordersData.length > 0 && !selectedOrderId) {
          setSelectedOrderId(ordersData[0].id);
        }
      }

      // 2. Load users database
      const usersRes = await fetch('/api/users');
      const usersData = await usersRes.json();
      if (Array.isArray(usersData)) {
        setUsers(usersData);
      }

      // 3. Load reviews
      const reviewsRes = await fetch('/api/feedback');
      const reviewsData = await reviewsRes.json();
      if (Array.isArray(reviewsData)) {
        setReviews(reviewsData);
      }
    } catch (err) {
      console.error("Error polling POS details", err);
    }
  };

  useEffect(() => {
    if (currentUser.role !== 'admin') return;

    loadData();
    // Poll administrative details every 4 seconds
    const interval = setInterval(loadData, 4000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const handleUpdateStatus = async (orderId: string, nextStatus: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });

      if (res.ok) {
        setInfoMsg(`Order ${orderId} successfully changed to ${nextStatus.toUpperCase()}`);
        setTimeout(() => setInfoMsg(''), 3000);
        
        // Update local status instantly
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: nextStatus as any } : o));
      } else {
        throw new Error('Failure setting status');
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  if (currentUser.role !== 'admin') {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <ShieldCheck className="w-16 h-16 text-red-500 mx-auto animate-pulse" />
        <h2 className="font-serif text-2xl font-bold text-brand-green">Access Unauthorized</h2>
        <p className="text-gray-500 font-sans text-sm">Your account does not possess the administrator authorization permissions required to operate this POS hardware.</p>
      </div>
    );
  }

  const selectedOrder = orders.find(o => o.id === selectedOrderId);
  
  // Calculate analytics
  const onlineCount = users.filter(u => u.isOnline).length;
  const pendingCount = orders.filter(o => o.status !== 'complete' && o.status !== 'cancelled').length;
  const totalRevenue = orders.filter(o => o.status === 'complete').reduce((sum, o) => sum + o.total, 0);

  return (
    <div className="space-y-8 pb-12">
      
      {/* POS Heading with statistics */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-gray-200 pb-5">
        <div>
          <span className="font-mono text-xs uppercase text-brand-orange font-bold tracking-widest block flex items-center gap-1">
            <Activity className="w-4 h-4 text-brand-orange shrink-0 animate-pulse" /> SECURE CONSOLE
          </span>
          <h1 className="font-serif text-3xl font-bold text-brand-green">Vinyard Admin POS</h1>
        </div>

        {/* Live metric bento grids */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 shrink-0">
          <div className="bg-white border border-gray-200 py-2.5 px-4 rounded shadow-sm text-center">
            <span className="block text-[10px] font-mono text-gray-400 font-bold uppercase">Online Users</span>
            <span className="text-lg font-mono font-bold text-emerald-600">● {onlineCount} Live</span>
          </div>
          <div className="bg-white border border-gray-200 py-2.5 px-4 rounded shadow-sm text-center">
            <span className="block text-[10px] font-mono text-gray-400 font-bold uppercase">Active Orders</span>
            <span className="text-lg font-mono font-bold text-brand-orange">{pendingCount} Active</span>
          </div>
          <div className="bg-white border border-gray-200 py-2.5 px-4 rounded shadow-sm text-center col-span-2 sm:col-span-1">
            <span className="block text-[10px] font-mono text-gray-400 font-bold uppercase">Net POS Sales</span>
            <span className="text-lg font-mono font-bold text-brand-green">₱{totalRevenue.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {infoMsg && (
        <div className="p-3 bg-brand-green text-white text-xs font-mono font-bold rounded shadow border border-[#ffa457]/50 animate-pulse flex items-center gap-1.5 justify-center">
          <CheckCircle className="w-4 h-4 text-[#ffa457]" /> {infoMsg}
        </div>
      )}

      {/* Segment switcher tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 py-3.5 px-6 font-serif text-sm font-bold border-b-2 cursor-pointer transition ${
            activeTab === 'orders'
              ? 'border-brand-orange text-brand-green bg-white'
              : 'border-transparent text-gray-400 hover:text-brand-green'
          }`}
        >
          <ClipboardList className="w-4.5 h-4.5" />
          <span>Active Orders & Queue ({pendingCount})</span>
        </button>
        <button
          onClick={() => setActiveTab('accounts')}
          className={`flex items-center gap-2 py-3.5 px-6 font-serif text-sm font-bold border-b-2 cursor-pointer transition ${
            activeTab === 'accounts'
              ? 'border-brand-orange text-brand-green bg-white'
              : 'border-transparent text-gray-400 hover:text-brand-green'
          }`}
        >
          <Users className="w-4.5 h-4.5" />
          <span>Registered Accounts ({users.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('reviews')}
          className={`flex items-center gap-2 py-3.5 px-6 font-serif text-sm font-bold border-b-2 cursor-pointer transition ${
            activeTab === 'reviews'
              ? 'border-brand-orange text-brand-green bg-white'
              : 'border-transparent text-gray-400 hover:text-brand-green'
          }`}
        >
          <Star className="w-4.5 h-4.5" />
          <span>Testimonials ({reviews.length})</span>
        </button>
      </div>

      {/* Screen Panels */}
      {activeTab === 'orders' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Active Orders List */}
          <div className="lg:col-span-5 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm h-[600px] flex flex-col justify-between">
            <div className="p-4 bg-zinc-50 border-b border-gray-200 font-serif font-bold text-sm text-brand-green">
              Live Cooking Pipelines
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {orders.length === 0 ? (
                <div className="p-8 text-center text-xs font-mono text-gray-400 leading-relaxed">
                  No cooking orders registered. Cravings await checkout!
                </div>
              ) : (
                orders.map(order => {
                  const itemsCount = order.items.reduce((acc, x) => acc + x.qty, 0);
                  const isCur = order.id === selectedOrderId;

                  return (
                    <div
                      key={order.id}
                      onClick={() => setSelectedOrderId(order.id)}
                      className={`p-4 transition-all duration-150 cursor-pointer text-left border-l-4 ${
                        isCur
                          ? 'bg-brand-green/5 border-brand-orange border-r border-r-gray-200'
                          : 'border-transparent hover:bg-zinc-50'
                      }`}
                    >
                      <div className="flex justify-between items-baseline gap-2">
                        <span className="font-mono text-xs font-black text-brand-green">{order.id}</span>
                        <span className="font-mono text-[10px] text-gray-400">{new Date(order.createdAt).toLocaleTimeString()}</span>
                      </div>

                      <div className="flex items-center justify-between mt-2.5">
                        <div className="space-y-0.5">
                          <p className="font-serif text-xs font-bold text-brand-green">{order.customerName}</p>
                          <p className="text-[10px] text-gray-400 font-mono tracking-wide">
                            {itemsCount} items • ₱{order.total.toFixed(2)} ({
                              order.paymentMethod === 'counter' 
                                ? 'Counter/Cash' 
                                : order.paymentMethod === 'gcash' 
                                  ? 'GCash' 
                                  : order.paymentMethod === 'card' 
                                    ? 'Card' 
                                    : 'COD'
                            })
                          </p>
                        </div>

                        {/* Badging statuses and Cancel action */}
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-mono font-bold border ${
                            order.status === 'received' 
                              ? 'bg-blue-50 border-blue-200 text-blue-700'
                              : order.status === 'preparing' 
                                ? 'bg-amber-50 border-amber-200 text-amber-700'
                                : order.status === 'ready' 
                                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                  : order.status === 'delivering' 
                                    ? 'bg-purple-50 border-purple-200 text-purple-700'
                                    : order.status === 'complete' 
                                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                      : 'bg-red-50 border-red-200 text-red-700'
                          }`}>
                            {order.status}
                          </span>

                          {order.status !== 'cancelled' && order.status !== 'complete' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOrderToCancel(order);
                              }}
                              className="text-[10px] font-mono font-bold text-red-600 hover:text-white bg-red-50 hover:bg-red-600 border border-red-200 hover:border-red-600 px-2 py-0.5 rounded transition shadow-sm cursor-pointer"
                            >
                              Cancel Order
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-3.5 bg-zinc-50 border-t border-gray-100 text-center font-mono text-[10px] text-gray-400 lowercase italic flex items-center justify-center gap-1 shadow-inner">
              <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
              <span>Real-time polling sync enabled</span>
            </div>
          </div>

          {/* Focused order panel detailing recipe, customizations, status changer, map route */}
          <div className="lg:col-span-7 space-y-6">
            {selectedOrder ? (
              <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6 shadow-sm">
                
                {/* Header */}
                <div className="flex justify-between items-start gap-4 border-b border-gray-100 pb-4">
                  <div className="space-y-1">
                    <span className="font-mono text-[10px] uppercase text-gray-400 font-bold">FOCUSED ORDER DETAILS</span>
                    <h3 className="font-serif text-lg font-bold text-brand-green">Pipeline: {selectedOrder.id}</h3>
                    <p className="text-xs text-gray-500 font-sans">
                      Recipient: <strong className="text-brand-green">{selectedOrder.customerName}</strong>
                    </p>
                  </div>

                  <div className="space-y-2 text-right">
                    <span className="block text-[10px] font-mono text-gray-400 font-bold uppercase">POS Controls</span>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <button
                        onClick={() => window.print()}
                        className="flex items-center gap-1.5 bg-brand-green hover:bg-brand-green-hover text-white py-1.5 px-3 rounded font-serif font-bold text-xs tracking-wide transition-all shadow-sm cursor-pointer border border-[#143e2d] hover:scale-102 active:scale-98"
                      >
                        <Printer className="w-3.5 h-3.5 text-brand-orange-hover" />
                        <span>Print Receipt</span>
                      </button>
                      <select
                        value={selectedOrder.status}
                        onChange={(e) => handleUpdateStatus(selectedOrder.id, e.target.value)}
                        className="text-xs font-mono font-bold bg-zinc-50 text-brand-green border border-gray-300 py-1.5 px-3 rounded cursor-pointer focus:outline-none focus:ring-1 focus:ring-brand-orange toggle-print-ignore"
                      >
                        <option value="received">1. Received</option>
                        <option value="preparing">2. Preparing</option>
                        <option value="ready">3. Ready / Dispatched</option>
                        <option value="delivering">4. Out for Delivery</option>
                        <option value="complete">5. Served / Complete</option>
                        <option value="cancelled">6. Cancel / Void</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Grid address summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-gray-100">
                  <div className="space-y-1 font-mono text-xs">
                    <p className="text-gray-400">Checkout Mode:</p>
                    <p className="font-bold text-brand-green uppercase">
                      {selectedOrder.address === 'Counter Pick-up'
                        ? `Counter Pickup (${
                            selectedOrder.paymentMethod === 'gcash'
                              ? 'GCash'
                              : selectedOrder.paymentMethod === 'card'
                                ? 'Card'
                                : 'Cash'
                          })`
                        : `${
                            selectedOrder.paymentMethod === 'gcash'
                              ? 'GCash Wallet'
                              : selectedOrder.paymentMethod === 'card'
                                ? 'Credit Card'
                                : 'COD'
                          } Delivery`}
                    </p>
                  </div>

                  <div className="space-y-1 font-mono text-xs text-right sm:text-left">
                    <p className="text-gray-400">Target Address Destination:</p>
                    <p className="font-bold text-brand-green truncate" title={selectedOrder.address}>{selectedOrder.address}</p>
                    {selectedOrder.deliveryInstructions && (
                      <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-amber-800">
                        <span className="font-bold flex items-center gap-1 mb-0.5 whitespace-nowrap"><AlertTriangle className="w-3 h-3" /> Note from Customer:</span>
                        <span className="italic block mt-1">"{selectedOrder.deliveryInstructions}"</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Items and customization receipts */}
                <div className="space-y-3 font-sans">
                  <span className="text-xs uppercase font-mono font-bold text-gray-400 block tracking-wider">Catering specifications</span>
                  <div className="bg-zinc-50 rounded border border-gray-200 p-4 divide-y divide-gray-200/60 max-h-48 overflow-y-auto space-y-3">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="text-xs pt-3 first:pt-0">
                        <div className="flex justify-between font-serif font-black text-brand-green">
                          <span>{item.qty}x {item.name}</span>
                          <span className="font-mono text-gray-500">₱{(item.price * item.qty).toFixed(2)}</span>
                        </div>
                        {item.customizations && (
                          <div className="pl-4 font-mono text-[10px] text-gray-400 mt-1 space-y-0.5">
                            {item.customizations.pattyDone && <p>• Done: {item.customizations.pattyDone}</p>}
                            {item.customizations.noOnions && <p>• No onions</p>}
                            {item.customizations.extraSauce && <p>• Extra sauce</p>}
                            {item.customizations.notes && <p>• Prep note: "{item.customizations.notes}"</p>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pricing Summary Breakdown */}
                <div className="bg-zinc-50 border border-gray-200 rounded p-4 font-mono text-xs space-y-1.5 text-left">
                  <div className="flex justify-between text-gray-500">
                    <span>Menu Items Subtotal:</span>
                    <span>₱{selectedOrder.subtotal.toFixed(2)}</span>
                  </div>
                  {selectedOrder.deliveryFee !== undefined && selectedOrder.deliveryFee > 0 && (
                    <div className="flex justify-between text-gray-500">
                      <span>Delivery Physical Fee ({selectedOrder.distance?.toFixed(2) || '0.00'} km):</span>
                      <span>₱{selectedOrder.deliveryFee.toFixed(2)}</span>
                    </div>
                  )}
                  {(() => {
                    const discount = (selectedOrder.subtotal + (selectedOrder.deliveryFee || 0)) - selectedOrder.total;
                    if (discount > 0.01) {
                      return (
                        <div className="flex justify-between text-[#914c00] font-bold">
                          <span>Loyalty Club Discount:</span>
                          <span>-₱{discount.toFixed(2)}</span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                  <div className="flex justify-between text-sm font-bold text-brand-green pt-2 border-t border-gray-200">
                    <span>Total Payment Revenue:</span>
                    <span>₱{selectedOrder.total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Map monitoring pinpoint */}
                <div className="space-y-2">
                  <span className="text-xs uppercase font-mono font-bold text-gray-400 block">Deliver coordinates radar mapping</span>
                  <div className={`transition-all duration-300 ${isFullscreen ? 'fixed inset-0 z-[100] bg-white rounded-none border-none' : 'h-56 rounded border border-gray-200 overflow-hidden relative bg-zinc-100'}`}>
                    {isMapKeyConfigured ? (
                      <APIProvider apiKey={MAPS_API_KEY} version="weekly">
                        <Map
                          defaultCenter={hqCoords}
                          defaultZoom={14}
                          mapId="POS_HQ_MONITOR_MAP"
                          internalUsageAttributionIds= {['gmp_mcp_codeassist_v1_aistudio']}
                          style={{ width: '100%', height: '100%' }}
                        >
                          {/* Restaurant HQ Marker */}
                          <AnimatedHQMarker 
                            position={hqCoords}
                            title="Vinyard Burger Bar (HQ)"
                          />

                          {/* Customer Destination Marker */}
                          <AdvancedMarker 
                            position={{ lat: selectedOrder.lat || 10.3971559, lng: selectedOrder.lng || 125.1983495 }}
                            title={selectedOrder.customerName}
                          >
                            <Pin background="#914c00" borderColor="#ffa457" glyphColor="#ffffff" />
                          </AdvancedMarker>

                          {/* Auto-fit logic */}
                          <MapAutoFit 
                            locations={[
                              hqCoords,
                              { lat: selectedOrder.lat || 10.3971559, lng: selectedOrder.lng || 125.1983495 }
                            ]} 
                          />

                          {/* Manual Recenter Control */}
                          <RecenterControl 
                            locations={[
                              hqCoords,
                              { lat: selectedOrder.lat || 10.3971559, lng: selectedOrder.lng || 125.1983495 }
                            ]} 
                          />

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
                      <div className="w-full h-full p-4 flex flex-col justify-between bg-slate-900 text-white relative">
                        <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] opacity-15"></div>
                        <div className="space-y-1 relative z-10 text-xs">
                          <p className="font-bold text-brand-orange-hover">📍 POS Coordinates Mapping</p>
                          <p className="font-mono text-[10px] text-zinc-400">Lat: {selectedOrder.lat?.toFixed(6) || '10.3971559'}, Lng: {selectedOrder.lng?.toFixed(6) || '125.1983495'}</p>
                        </div>
                        <div className="bg-brand-green/30 border border-white/10 p-3 rounded text-[11px] text-zinc-300 relative z-10">
                          <p className="font-semibold text-white">Recipient Address Locator:</p>
                          <p className="font-serif italic mt-0.5 mt-0.5">"{selectedOrder.address}"</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            ) : (
              <div className="h-full bg-white border border-gray-200 rounded-xl flex items-center justify-center p-8 text-center text-xs font-mono text-gray-400">
                Pick a kitchen queue order on the left column to configure POS status.
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'accounts' ? (
        /* Users List table */
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 bg-zinc-50 border-b border-gray-200 font-serif font-bold text-sm text-brand-green">
            Customer Registry Database
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-sans text-xs sm:text-xs">
              <thead>
                <tr className="bg-zinc-50 border-b border-gray-200 text-gray-400 uppercase font-mono tracking-widest text-[9px] font-bold">
                  <th className="p-4">Customer Name</th>
                  <th className="p-4">Email Credentials</th>
                  <th className="p-4">Assigned Role</th>
                  <th className="p-4">Loyalty Balance</th>
                  <th className="p-4">Active Session</th>
                  <th className="p-4 text-right">Coordinates Pin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-zinc-50/50">
                    <td className="p-4 font-bold text-brand-green font-serif">{u.name}</td>
                    <td className="p-4 font-mono text-gray-500">{u.email}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold capitalize border ${
                        u.role === 'admin'
                          ? 'bg-orange-50 border-orange-200 text-orange-700'
                          : 'bg-zinc-50 border-zinc-200 text-zinc-600'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-[#914c00] font-bold">⭐ {u.loyaltyPoints} PTS</td>
                    <td className="p-4 font-semibold">
                      {u.isOnline ? (
                        <span className="text-emerald-600 animate-pulse font-bold">● Active Online</span>
                      ) : (
                        <span className="text-gray-400">Offline</span>
                      )}
                    </td>
                    <td className="p-4 text-right font-mono text-gray-400 text-[10px]">
                      {u.lat ? `${u.lat.toFixed(4)}, ${u.lng?.toFixed(4)}` : 'No pin preset'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Testimonials panel review lists */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {/* Reviews break down dashboard */}
            <div className="bg-gradient-to-br from-brand-orange/5 to-amber-500/10 border border-brand-orange/15 rounded-xl p-5 flex flex-col justify-between shadow-xs col-span-1 md:col-span-2">
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase text-gray-400 tracking-wider block">QUALITATIVE METRICS</span>
                <h4 className="font-serif text-lg font-bold text-brand-green">Total Moderated Feedbacks</h4>
              </div>
              <div className="text-3xl font-mono font-black text-brand-green mt-3">
                ⭐ {reviews.length} Feedbacks Posted
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5 text-center shadow-xs">
              <span className="text-[10px] font-mono uppercase text-gray-400 tracking-wider block">Average Stars</span>
              <span className="text-3xl font-mono font-black text-brand-orange mt-2.5 block">
                {reviews.length ? (reviews.reduce((acc, x) => acc + x.rating, 0) / reviews.length).toFixed(1) : '5.0'} / 5.0
              </span>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5 text-center shadow-xs">
              <span className="text-[10px] font-mono uppercase text-gray-400 tracking-wider block">Chef Stars Score</span>
              <span className="text-3xl font-mono font-black text-emerald-600 mt-2.5 block">100% Quality</span>
            </div>
          </div>

          {/* Testimonial comments grids card */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 bg-zinc-50 border-b border-gray-200 font-serif font-bold text-sm text-brand-green">
              Testimonials comments feed
            </div>

            <div className="divide-y divide-gray-100">
              {reviews.map(item => (
                <div key={item.id} className="p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:bg-zinc-50/50">
                  <div className="space-y-1.5 max-w-xl text-left">
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`w-3.5 h-3.5 ${
                            i < item.rating 
                              ? 'text-amber-500 fill-amber-500' 
                              : 'text-gray-100'
                          }`} 
                        />
                      ))}
                    </div>
                    <p className="text-zinc-600 text-xs sm:text-xs leading-relaxed italic">
                      "{item.comment}"
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="font-serif font-bold text-brand-green text-sm">{item.customerName}</p>
                    <p className="font-mono text-[10px] text-gray-400 mt-0.5">{new Date(item.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Confirmation Dialog */}
      {orderToCancel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-sm w-full p-6 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 mx-auto">
              <AlertTriangle className="w-6 h-6 animate-bounce" />
            </div>
            
            <div className="text-center space-y-1.5">
              <h3 className="font-serif text-lg font-bold text-brand-green">Cancel Order?</h3>
              <p className="text-xs text-gray-500 font-sans leading-relaxed">
                Are you sure you want to cancel order <strong className="font-mono text-zinc-900">{orderToCancel.id}</strong> for <strong className="text-zinc-900">{orderToCancel.customerName}</strong>? This action will set the order status to cancelled in the database.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setOrderToCancel(null)}
                className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-serif font-bold text-xs py-2 px-4 rounded border border-gray-200 transition cursor-pointer"
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={async () => {
                  await handleUpdateStatus(orderToCancel.id, 'cancelled');
                  setOrderToCancel(null);
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-serif font-bold text-xs py-2 px-4 rounded transition cursor-pointer"
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
