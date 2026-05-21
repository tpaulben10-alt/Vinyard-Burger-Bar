import React, { useState } from 'react';
import { OrderItem, User } from '../types';
import { X, Trash2, Plus, Minus, CreditCard, Landmark, Truck, UserPlus, Gift, AlertCircle, Smartphone, Wallet, QrCode } from 'lucide-react';

interface CartTrayProps {
  currentUser: User | null;
  cartItems: OrderItem[];
  onUpdateQty: (menuItemId: string, nextQty: number) => void;
  onRemoveItem: (menuItemId: string) => void;
  onClose: () => void;
  onOrderSuccess: (order: any, updatedPoints: number) => void;
  onOpenAuth: () => void;
}

export default function CartTray({
  currentUser,
  cartItems,
  onUpdateQty,
  onRemoveItem,
  onClose,
  onOrderSuccess,
  onOpenAuth
}: CartTrayProps) {
  // Service parameters
  const [serviceMode, setServiceMode] = useState<'delivery' | 'counter'>('delivery');
  const [address, setAddress] = useState(currentUser?.address || 'Catmonan St., Poblacion , Hinunangan, Philippines');
  const [lat, setLat] = useState(currentUser?.lat || 10.3971559);
  const [lng, setLng] = useState(currentUser?.lng || 125.1983495);
  
  // Payment option parameters
  const [paymentOpt, setPaymentOpt] = useState<'cash' | 'gcash' | 'card'>('cash');
  const [gcashNumber, setGcashNumber] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  
  // Loyalty redemption status
  const [redeemPointsChecked, setRedeemPointsChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Update profile variables locally if user changed
  React.useEffect(() => {
    if (currentUser) {
      if (currentUser.address) setAddress(currentUser.address);
      if (currentUser.lat !== undefined) setLat(currentUser.lat);
      if (currentUser.lng !== undefined) setLng(currentUser.lng);
    }
  }, [currentUser]);

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

  // Pricing computations
  const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.qty), 0);
  const distance = serviceMode === 'delivery' ? getHaversineDistance(10.3971559, 125.1983495, lat, lng) : 0;
  const deliveryFee = serviceMode === 'delivery' ? Math.round(45.0 + (distance * 10)) : 0;

  // Points conversion: 1 point = ₱1.00 discount
  const maxRedeemablePoints = currentUser ? Math.min(currentUser.loyaltyPoints, Math.floor(subtotal)) : 0;
  const loyaltyDiscount = redeemPointsChecked ? maxRedeemablePoints : 0;
  const total = Math.max(0, subtotal + deliveryFee - loyaltyDiscount);

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;
    if (!currentUser) {
      setErrorMsg('Kindly authenticate your customer account to process checkout orders.');
      onOpenAuth();
      return;
    }
    setErrorMsg('');

    if (paymentOpt === 'gcash' && (!gcashNumber || gcashNumber.length < 11)) {
      setErrorMsg('Kindly enter a valid 11-digit GCash mobile number to continue.');
      return;
    }
    if (paymentOpt === 'card' && (!cardNumber || cardNumber.replace(/\s/g, '').length < 15 || !cardExpiry || cardExpiry.length < 5 || !cardCvv || cardCvv.length < 3)) {
      setErrorMsg('Kindly fill out all credit card fields completely.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          items: cartItems,
          subtotal,
          deliveryFee,
          distance,
          total,
          paymentMethod: paymentOpt === 'cash' ? (serviceMode === 'counter' ? 'counter' : 'delivery') : paymentOpt,
          address: serviceMode === 'delivery' ? address : 'Counter Pick-up',
          lat: serviceMode === 'delivery' ? lat : 10.3971559,
          lng: serviceMode === 'delivery' ? lng : 125.1983495,
          redeemPoints: redeemPointsChecked ? maxRedeemablePoints : 0
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Checkout process rejected by POS.');
      }

      onOrderSuccess(data.order, data.user.loyaltyPoints);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating order.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex justify-end backdrop-blur-xs font-sans">
      
      {/* Click outside to close */}
      <div onClick={onClose} className="flex-1 cursor-pointer"></div>

      {/* Cart side panel */}
      <div className="w-full max-w-md bg-white h-full flex flex-col justify-between shadow-2xl border-l border-brand-green/15 tray-shadow">
        
        {/* Tray Header */}
        <div className="p-5 bg-brand-green text-white flex justify-between items-center rustic-wood-texture border-b border-brand-green-hover shrink-0">
          <div className="flex items-center gap-2">
            <span className="bg-brand-orange text-white text-xs font-mono font-bold px-2 py-0.5 rounded shadow">Tray</span>
            <h3 className="font-serif text-lg font-bold">Shopping Tray</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-white/75 hover:text-white rounded transition hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable basket contents */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          
          {errorMsg && (
            <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs rounded font-medium">
              {errorMsg}
            </div>
          )}

          {/* Cart list items */}
          {cartItems.length === 0 ? (
            <div className="py-20 text-center space-y-4">
              <span className="text-3xl block">🍔</span>
              <p className="font-serif text-base font-bold text-brand-green">Your shopping tray is empty.</p>
              <p className="text-xs text-gray-400 font-sans max-w-xs mx-auto">Explore our gourmet hamburger cookbook and load your favorites!</p>
            </div>
          ) : (
            <div className="space-y-4 divide-y divide-gray-100">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 block font-mono">My Selections</span>
              {cartItems.map((item, idx) => (
                <div key={item.menuItemId} className="pt-3 first:pt-0 space-y-1.5">
                  <div className="flex justify-between items-start gap-3">
                    <div className="text-left">
                      <h4 className="font-serif font-black text-sm text-brand-green leading-snug">{item.name}</h4>
                      <p className="text-xs font-mono text-brand-orange font-bold mt-0.5">₱{item.price.toFixed(2)} each</p>
                    </div>

                    {/* Quantities adjuster */}
                    <div className="flex items-center border border-gray-200 rounded shrink-0 bg-zinc-50">
                      <button 
                        onClick={() => onUpdateQty(item.menuItemId, item.qty - 1)}
                        className="p-1 hover:bg-gray-100 text-gray-500 transition"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-7 text-center font-mono text-xs font-bold text-brand-green">{item.qty}</span>
                      <button 
                        onClick={() => onUpdateQty(item.menuItemId, item.qty + 1)}
                        className="p-1 hover:bg-gray-100 text-gray-500 transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Render Customizations */}
                  {item.customizations && (
                    <div className="pl-3.5 border-l-2 border-brand-orange/40 font-mono text-[10px] text-gray-400 space-y-0.5 text-left">
                      {item.customizations.pattyDone && <p>• Doneness: {item.customizations.pattyDone}</p>}
                      {item.customizations.noOnions && <p>• No raw onions</p>}
                      {item.customizations.extraSauce && <p>• Extra house sauce</p>}
                      {item.customizations.notes && <p>• Note: "{item.customizations.notes}"</p>}
                    </div>
                  )}

                  <div className="flex justify-between items-center text-xs pt-1">
                    <button
                      onClick={() => onRemoveItem(item.menuItemId)}
                      className="text-gray-400 hover:text-red-500 flex items-center gap-1 font-mono text-[10px] transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                    <span className="font-mono font-bold text-brand-green">₱{(item.price * item.qty).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Checkout specifiers (Render only if cart items exist) */}
          {cartItems.length > 0 && (
            <div className="space-y-5 border-t border-gray-100 pt-5 text-left">
              
              {/* Pickup / Delivery Toggles */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 block font-mono">Service Selection</span>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setServiceMode('delivery')}
                    className={`p-3 border rounded text-xs font-bold flex flex-col items-center gap-1.5 transition ${
                      serviceMode === 'delivery'
                        ? 'border-brand-green bg-brand-green/5 text-brand-green shadow-sm'
                        : 'border-gray-200 text-gray-400 hover:border-gray-300'
                    }`}
                  >
                    <Truck className="w-4 h-4" />
                    <span>Home Delivery</span>
                  </button>
                  <button
                    onClick={() => setServiceMode('counter')}
                    className={`p-3 border rounded text-xs font-bold flex flex-col items-center gap-1.5 transition ${
                      serviceMode === 'counter'
                        ? 'border-brand-green bg-brand-green/5 text-brand-green shadow-sm'
                        : 'border-gray-200 text-gray-400 hover:border-gray-300'
                    }`}
                  >
                    <Landmark className="w-4 h-4" />
                    <span>Counter Pickup</span>
                  </button>
                </div>
              </div>

              {/* Home Delivery detail specs mapping */}
              {serviceMode === 'delivery' && (
                <div className="space-y-2.5 bg-zinc-50 border border-gray-200 p-4 rounded text-xs">
                  <div className="space-y-1">
                    <p className="font-mono font-bold uppercase tracking-wider text-[10px] text-gray-400">Target Shipment Destination</p>
                    <p className="font-serif font-bold text-brand-green">{currentUser?.name || 'Guest User'}</p>
                    <p className="text-zinc-600 font-sans mt-0.5">{address}</p>
                  </div>
                  <div className="pt-2 border-t border-gray-200/60 font-mono text-[10px] text-gray-400 space-y-1 flex flex-col">
                    <div className="flex justify-between items-baseline">
                      <span>Delivery Physical Distance:</span>
                      <span className="font-bold text-brand-green">{distance.toFixed(2)} km</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span>GPS Map coordinates:</span>
                      <span className="font-semibold text-brand-orange-hover">{lat.toFixed(4)}, {lng.toFixed(4)}</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-gray-400 font-mono italic">
                    ★ To customize coordinates, configure inside <strong>My Profile settings page</strong>.
                  </div>
                </div>
              )}

              {/* Payment Method Selection */}
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 block font-mono">Payment Method Selection</span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentOpt('cash')}
                    className={`py-2 px-1 border rounded text-[10px] font-bold flex flex-col items-center gap-1.5 transition cursor-pointer ${
                      paymentOpt === 'cash'
                        ? 'border-brand-green bg-brand-green/5 text-brand-green shadow-sm'
                        : 'border-gray-200 text-gray-400 hover:border-gray-300'
                    }`}
                  >
                    <Wallet className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{serviceMode === 'delivery' ? 'COD / Cash' : 'Counter Cash'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentOpt('gcash')}
                    className={`py-2 px-1 border rounded text-[10px] font-bold flex flex-col items-center gap-1.5 transition cursor-pointer ${
                      paymentOpt === 'gcash'
                        ? 'border-brand-green bg-brand-green/5 text-brand-green shadow-sm'
                        : 'border-gray-200 text-gray-400 hover:border-gray-300'
                    }`}
                  >
                    <Smartphone className="w-4 h-4 text-blue-500 shrink-0" />
                    <span>GCash Wallet</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentOpt('card')}
                    className={`py-2 px-1 border rounded text-[10px] font-bold flex flex-col items-center gap-1.5 transition cursor-pointer ${
                      paymentOpt === 'card'
                        ? 'border-brand-green bg-brand-green/5 text-brand-green shadow-sm'
                        : 'border-gray-200 text-gray-400 hover:border-gray-300'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-brand-orange shrink-0" />
                    <span>Credit Card</span>
                  </button>
                </div>

                {/* Conditional Fields for GCash */}
                {paymentOpt === 'gcash' && (
                  <div className="p-3 bg-blue-50/50 border border-blue-200/60 rounded-lg space-y-2 animate-fade-in text-xs">
                    <div className="flex items-center gap-1.5 text-blue-700 font-bold font-mono">
                      <QrCode className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>GCash Wallet checkout</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-normal">
                      Funds will be securely processed via your GCash wallet on checkout confirmation. Please specify your 11-digit GCash mobile account.
                    </p>
                    <div className="space-y-1">
                      <label className="block text-[9px] uppercase font-mono tracking-wider font-bold text-gray-400">GCash Mobile Number</label>
                      <input
                        type="tel"
                        maxLength={11}
                        placeholder="e.g. 09171234567"
                        value={gcashNumber}
                        onChange={(e) => setGcashNumber(e.target.value.replace(/\D/g, ''))}
                        className="w-full p-2 border border-blue-200 rounded bg-white font-mono text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* Conditional Fields for Credit Card */}
                {paymentOpt === 'card' && (
                  <div className="p-3 bg-zinc-50 border border-gray-200 rounded-lg space-y-2 animate-fade-in text-xs">
                    <div className="flex items-center gap-1.5 text-brand-green font-bold font-mono">
                      <CreditCard className="w-4 h-4 text-brand-orange shrink-0" />
                      <span>Credit or Debit Card Gateway</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-normal font-sans">
                      All payment information is encrypted and transmitted securely. We support Visa, Mastercard, and JCB cards.
                    </p>
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <label className="block text-[9px] uppercase font-mono tracking-wider font-bold text-gray-400 font-mono">Card Number</label>
                        <input
                          type="text"
                          maxLength={19}
                          placeholder="4111 2222 3333 4444"
                          value={cardNumber}
                          onChange={(e) => {
                            let val = e.target.value.replace(/\D/g, '');
                            let formatted = val.match(/.{1,4}/g)?.join(' ') || val;
                            setCardNumber(formatted);
                          }}
                          className="w-full p-2 border border-gray-300 rounded bg-white font-mono text-xs focus:ring-1 focus:ring-brand-orange focus:outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="block text-[9px] uppercase font-mono tracking-wider font-bold text-gray-400">Expiry (MM/YY)</label>
                          <input
                            type="text"
                            maxLength={5}
                            placeholder="12/28"
                            value={cardExpiry}
                            onChange={(e) => {
                              let val = e.target.value.replace(/\D/g, '');
                              if (val.length > 2) {
                                val = val.substring(0, 2) + '/' + val.substring(2);
                              }
                              setCardExpiry(val);
                            }}
                            className="w-full p-2 border border-gray-300 rounded bg-white font-mono text-xs focus:ring-1 focus:ring-brand-orange focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[9px] uppercase font-mono tracking-wider font-bold text-gray-400">CVV</label>
                          <input
                            type="password"
                            maxLength={3}
                            placeholder="***"
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                            className="w-full p-2 border border-gray-300 rounded bg-white font-mono text-xs focus:ring-1 focus:ring-brand-orange focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Loyalty Reward redemption logic */}
              {currentUser ? (
                maxRedeemablePoints > 0 ? (
                  <div className="bg-gradient-to-r from-[#914c00]/5 to-amber-500/10 border border-brand-orange/20 p-4 rounded-lg space-y-3">
                    <div className="flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        id="redeemPoints"
                        checked={redeemPointsChecked}
                        onChange={(e) => setRedeemPointsChecked(e.target.checked)}
                        className="w-4 h-4 mt-0.5 accent-brand-green cursor-pointer"
                      />
                      <label htmlFor="redeemPoints" className="text-xs cursor-pointer select-none">
                        <span className="font-serif font-black text-brand-green block">Redeem Loyalty Club Points!</span>
                        <span className="text-gray-500 text-[11px] block mt-0.5">
                          You possess <strong className="text-brand-orange font-mono">⭐ {currentUser.loyaltyPoints} PTS</strong>. Spend up to <strong className="font-mono text-brand-green">{maxRedeemablePoints} PTS</strong> for a <strong className="text-brand-orange font-mono">-₱{maxRedeemablePoints.toFixed(2)}</strong> cash deduction instantly!
                        </span>
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 border border-dashed border-gray-200 rounded text-[11px] text-gray-400 font-mono flex items-center gap-1">
                    <Gift className="w-3.5 h-3.5 shrink-0 text-brand-orange" />
                    <span>Loyalty Level: ⭐ {currentUser.loyaltyPoints} PTS. Earn 1 point per ₱10 spent!</span>
                  </div>
                )
              ) : (
                <div className="p-3.5 border border-dashed border-brand-orange/40 rounded bg-brand-orange/5 text-center space-y-2">
                  <p className="text-xs text-brand-green font-serif font-medium leading-relaxed">
                    Log in to earn/redeem <strong>Vinyard Loyalty rewards points</strong> and track active delivery status!
                  </p>
                  <button
                    onClick={onOpenAuth}
                    type="button"
                    className="py-1 px-3 bg-brand-orange text-white text-[11px] font-bold font-mono rounded inline-flex items-center gap-1 cursor-pointer hover:bg-brand-orange-hover transition"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Connect Account
                  </button>
                </div>
              )}

            </div>
          )}

        </div>

        {/* Tray Footer (Pricing Summary & Call to Action) */}
        {cartItems.length > 0 && (
          <div className="p-5 bg-zinc-50 border-t border-gray-200 space-y-4 shrink-0">
            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal amount:</span>
                <span>₱{subtotal.toFixed(2)}</span>
              </div>
              
              {serviceMode === 'delivery' && (
                <div className="flex justify-between text-gray-500">
                  <span>Delivery Fee ({distance.toFixed(2)} km):</span>
                  <span>₱{deliveryFee.toFixed(2)}</span>
                </div>
              )}
              
              {loyaltyDiscount > 0 && (
                <div className="flex justify-between text-[#914c00] font-bold">
                  <span>Loyalty Discount:</span>
                  <span>-₱{loyaltyDiscount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-[#914c00] font-bold">
                <span>Estimated Point gain:</span>
                <span>⭐⭐ +{Math.floor(total / 10)} PTS</span>
              </div>

              <div className="flex justify-between text-base font-serif font-black text-brand-green pt-2 border-t border-gray-200">
                <span>Total Payment:</span>
                <span>₱{total.toFixed(2)}</span>
              </div>

              <span className="block text-[10px] text-center text-gray-400 tracking-wide mt-1">
                {paymentOpt === 'gcash'
                  ? '📱 Online Wallet: GCash Checkout (Sandbox)'
                  : paymentOpt === 'card'
                    ? '💳 Secure Credit/Debit Card Transaction (Sandbox)'
                    : serviceMode === 'delivery'
                      ? '🛵 Cash Payment: COD (Upon Delivery)'
                      : '💵 Cash Payment: Pay At Restaurant Counter'
                }
              </span>
            </div>

            <button
              onClick={handleCheckout}
              disabled={isLoading || cartItems.length === 0}
              className="w-full h-12 bg-brand-orange hover:bg-brand-orange-hover text-white rounded font-serif font-bold tracking-wide transition uppercase shadow flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? 'SUBMITTING TO POS...' : 'SUBMIT CHECKOUT ORDER'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
