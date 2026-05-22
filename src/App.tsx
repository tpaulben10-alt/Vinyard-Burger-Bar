import React, { useState, useEffect } from 'react';
import { User, OrderItem } from './types';
import Navbar from './components/Navbar';
import HomeHero from './components/HomeHero';
import MenuGrid from './components/MenuGrid';
import UserProfile from './components/UserProfile';
import OrderTracker from './components/OrderTracker';
import POSManager from './components/POSManager';
import SecurityPortal from './components/SecurityPortal';
import CartTray from './components/CartTray';
import { Smartphone, Mail, Globe, MapPin, Smile } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeScreen, setActiveScreen] = useState<'home' | 'menu' | 'track' | 'admin' | 'profile'>('home');
  const [cartItems, setCartItems] = useState<OrderItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [quickSelectId, setQuickSelectId] = useState<string | null>(null);
  const [trackOrderId, setTrackOrderId] = useState<string | null>(null);

  // Load session from browser localStorage at start to stay logged in
  useEffect(() => {
    try {
      const cached = localStorage.getItem('vinyard_cached_user');
      if (cached) {
        const u = JSON.parse(cached);
        setCurrentUser(u);
        
        // Let server know session is alive and set online indicator
        fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: u.email, isGoogleAuth: true })
        }).catch(e => console.warn("Session check ignored in sandbox mode"));
      }

      const cachedCart = localStorage.getItem('vinyard_cached_cart');
      if (cachedCart) {
        setCartItems(JSON.parse(cachedCart));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Update Cart cache automatically
  const updateCartItemsAndCache = (updated: OrderItem[]) => {
    setCartItems(updated);
    try {
      localStorage.setItem('vinyard_cached_cart', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('vinyard_cached_user', JSON.stringify(user));
    } catch (e) {
      console.error(e);
    }
    setIsAuthOpen(false);

    // Redirect admins directly to the POS console
    if (user.role === 'admin') {
      setActiveScreen('admin');
    }
  };

  const handleLogout = async () => {
    if (currentUser) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.id })
        });
      } catch (e) {
        console.error(e);
      }
    }
    setCurrentUser(null);
    try {
      localStorage.removeItem('vinyard_cached_user');
    } catch (e) {
      console.error(e);
    }
    setActiveScreen('home');
  };

  const handleAddToTray = (newItem: OrderItem) => {
    const existingIdx = cartItems.findIndex(item => 
      item.menuItemId === newItem.menuItemId && 
      JSON.stringify(item.customizations) === JSON.stringify(newItem.customizations)
    );

    if (existingIdx > -1) {
      const nextCart = [...cartItems];
      nextCart[existingIdx].qty += newItem.qty;
      updateCartItemsAndCache(nextCart);
    } else {
      updateCartItemsAndCache([...cartItems, newItem]);
    }
  };

  const handleUpdateQty = (menuItemId: string, nextQty: number) => {
    if (nextQty <= 0) {
      handleRemoveItem(menuItemId);
    } else {
      const nextCart = cartItems.map(item => 
        item.menuItemId === menuItemId ? { ...item, qty: nextQty } : item
      );
      updateCartItemsAndCache(nextCart);
    }
  };

  const handleRemoveItem = (menuItemId: string) => {
    const nextCart = cartItems.filter(item => item.menuItemId !== menuItemId);
    updateCartItemsAndCache(nextCart);
  };

  // Profile fields update sync back to cookie storage
  const handleProfileUpdate = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    try {
      localStorage.setItem('vinyard_cached_user', JSON.stringify(updatedUser));
    } catch (e) {
      console.error(e);
    }
  };

  const handleCheckoutSuccess = (finishedOrder: any, updatedPoints: number) => {
    // Subtract / set loyalty points correctly on user
    if (currentUser) {
      const refreshed = { ...currentUser, loyaltyPoints: updatedPoints };
      setCurrentUser(refreshed);
      try {
        localStorage.setItem('vinyard_cached_user', JSON.stringify(refreshed));
      } catch (e) {
        console.error(e);
      }
    }

    // Flush active shopping cart bucket
    updateCartItemsAndCache([]);
    setIsCartOpen(false);
    
    // Jump straight to Track Order screen
    setActiveScreen('track');
  };

  const handleQuickFeaturedClick = (itemId: string) => {
    setQuickSelectId(itemId);
    setActiveScreen('menu');
  };

  const handleReorder = (items: OrderItem[]) => {
    // Add all items from the historical order to the current tray
    const nextCart = [...cartItems];
    items.forEach(newItem => {
      const existingIdx = nextCart.findIndex(item => 
        item.menuItemId === newItem.menuItemId && 
        JSON.stringify(item.customizations) === JSON.stringify(newItem.customizations)
      );

      if (existingIdx > -1) {
        nextCart[existingIdx].qty += newItem.qty;
      } else {
        nextCart.push(newItem);
      }
    });

    updateCartItemsAndCache(nextCart);
    setIsCartOpen(true); // Open cart to show the added items
  };

  const handleTrackSpecificOrder = (orderId: string) => {
    setTrackOrderId(orderId);
    setActiveScreen('track');
  };

  const cartCount = cartItems.reduce((acc, item) => acc + item.qty, 0);
  const cartTotal = cartItems.reduce((acc, item) => acc + (item.price * item.qty), 0);

  return (
    <div 
      className="min-h-screen flex flex-col justify-between text-zinc-800 relative bg-[#f7f9ff]"
      style={{
        backgroundImage: "linear-gradient(rgba(247, 249, 255, 0.91), rgba(247, 249, 255, 0.95)), url('/src/assets/images/vinyard_storefront_1779375096734.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      
      {/* Navbar segment */}
      <Navbar
        currentUser={currentUser}
        activeScreen={activeScreen}
        setScreen={setActiveScreen}
        cartCount={cartCount}
        cartTotal={cartTotal}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main interactive viewpoint layout container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeScreen === 'home' && (
          <HomeHero
            onOrderClick={() => setActiveScreen('menu')}
            onFeaturedClick={handleQuickFeaturedClick}
          />
        )}

        {activeScreen === 'menu' && (
          <MenuGrid
            onAddToTray={handleAddToTray}
            quickSelectId={quickSelectId}
            resetQuickSelect={() => setQuickSelectId(null)}
            availableLoyaltyPoints={currentUser?.loyaltyPoints || 0}
          />
        )}

        {activeScreen === 'track' && (
          <OrderTracker
            currentUser={currentUser}
            onRefreshUser={handleProfileUpdate}
            trackOrderId={trackOrderId}
            clearTrackOrderId={() => setTrackOrderId(null)}
          />
        )}

        {activeScreen === 'profile' && currentUser && (
          <UserProfile
            currentUser={currentUser}
            onProfileUpdate={handleProfileUpdate}
            onReorder={handleReorder}
            onTrackOrder={handleTrackSpecificOrder}
          />
        )}

        {activeScreen === 'admin' && currentUser && (
          <POSManager 
            currentUser={currentUser} 
          />
        )}
      </main>

      {/* Persistent global footer */}
      <footer className="bg-brand-green border-t border-brand-green-hover py-8 text-white/50 text-xs font-mono select-none shrink-0 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex flex-col items-center sm:items-start">
            <p className="font-serif text-sm font-semibold text-white tracking-wide">Vinyard Burger Bar House</p>
            <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest text-[#ffa457]">Catmonan St., Poblacion, Hinunangan, Philippines</p>
          </div>
          
          <div className="flex items-center gap-4 text-[10px]">
            <span>📞 0912 043 1891</span>
            <span>⭐ Loyalty Reward Redemptions Active</span>
            <span>🔐 Admin POS Portal Integration</span>
          </div>

          <p className="text-[10px]">
            &copy; {new Date().getFullYear()} Vinyard. All Rights Reserved.
          </p>
        </div>
      </footer>

      {/* Global Shopper Tray drawer panel Overlay */}
      {isCartOpen && (
        <CartTray
          currentUser={currentUser}
          cartItems={cartItems}
          onUpdateQty={handleUpdateQty}
          onRemoveItem={handleRemoveItem}
          onClose={() => setIsCartOpen(false)}
          onOrderSuccess={handleCheckoutSuccess}
          onOpenAuth={() => { setIsCartOpen(false); setIsAuthOpen(true); }}
        />
      )}

      {/* Global Security credentials prompt Overlay modal */}
      {isAuthOpen && (
        <div className="fixed inset-0 z-50 bg-black/65 flex items-center justify-center p-4 backdrop-blur-xs">
          {/* Click background to close */}
          <div onClick={() => setIsAuthOpen(false)} className="absolute inset-0 cursor-pointer"></div>

          <div className="relative z-10 w-full max-w-[480px]">
            <SecurityPortal
              onLoginSuccess={handleLoginSuccess}
              onClose={() => setIsAuthOpen(false)}
            />
          </div>
        </div>
      )}

    </div>
  );
}
