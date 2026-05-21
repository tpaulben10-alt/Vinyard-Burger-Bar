import React from 'react';
import { User } from '../types';
import { ShoppingBag, MapPin, Award, LogOut, User as UserIcon, ShieldAlert } from 'lucide-react';

interface NavbarProps {
  currentUser: User | null;
  activeScreen: 'home' | 'menu' | 'track' | 'admin' | 'profile';
  setScreen: (screen: 'home' | 'menu' | 'track' | 'admin' | 'profile') => void;
  cartCount: number;
  cartTotal: number;
  onOpenCart: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export default function Navbar({
  currentUser,
  activeScreen,
  setScreen,
  cartCount,
  cartTotal,
  onOpenCart,
  onOpenAuth,
  onLogout
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 w-full bg-brand-green text-white shadow-md border-b border-brand-green-hover">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo & Slogan */}
          <div 
            onClick={() => setScreen('home')} 
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-full border border-white/20 bg-brand-orange text-white flex items-center justify-center font-serif font-black text-xl transition-all group-hover:bg-amber-600 shadow-inner">
              VY
            </div>
            <div>
              <span className="font-serif text-2xl font-bold tracking-tight block text-white group-hover:text-brand-orange-hover transition-colors">
                VINYARD
              </span>
              <span className="font-mono text-[9px] uppercase tracking-widest text-[#ffa457] font-bold block -mt-1">
                Burger Bar & POS
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 font-serif text-base font-medium">
            <button
              onClick={() => setScreen('home')}
              className={`px-4 py-2 rounded transition-all cursor-pointer ${
                activeScreen === 'home' 
                  ? 'bg-brand-green-hover text-brand-orange-hover font-bold border border-brand-orange/40' 
                  : 'text-zinc-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => setScreen('menu')}
              className={`px-4 py-2 rounded transition-all cursor-pointer ${
                activeScreen === 'menu' 
                  ? 'bg-brand-green-hover text-brand-orange-hover font-bold border border-brand-orange/40' 
                  : 'text-zinc-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Order Menu
            </button>
            <button
              onClick={() => setScreen('track')}
              className={`px-4 py-2 rounded transition-all cursor-pointer ${
                activeScreen === 'track' 
                  ? 'bg-brand-green-hover text-brand-orange-hover font-bold border border-brand-orange/40' 
                  : 'text-zinc-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Track Order
            </button>
          </nav>

          {/* Quick Info & Interactions */}
          <div className="flex items-center gap-4">
            
            {/* Delivery address banner display */}
            <div className="hidden lg:flex items-center gap-2 bg-black/20 hover:bg-black/30 transition px-3.5 py-1.5 rounded-full border border-white/5 font-sans font-medium text-xs text-zinc-200">
              <MapPin className="w-3.5 h-3.5 text-brand-orange" />
              <span className="truncate max-w-[200px]">Catmonan St., Hinunangan</span>
            </div>

            {/* Loyalty Points display */}
            {currentUser && currentUser.role === 'customer' && (
              <div 
                onClick={() => setScreen('profile')}
                className="flex items-center gap-1.5 bg-amber-500/15 text-brand-orange-hover border border-brand-orange/30 px-3 py-1.5 rounded-full font-mono text-xs font-bold hover:bg-amber-500/25 transition cursor-pointer"
                title="Your Loyalty points balance. Tap to redeem or earn 10 points per dollar!"
              >
                <Award className="w-4 h-4 text-brand-orange-hover fill-brand-orange" />
                <span>⭐ {currentUser.loyaltyPoints} PTS</span>
              </div>
            )}

            {/* Admin trigger button if user is Admin */}
            {currentUser && currentUser.role === 'admin' && (
              <button
                onClick={() => setScreen('admin')}
                className={`py-1.5 px-3.5 text-xs font-bold font-mono rounded-full flex items-center gap-1.5 cursor-pointer uppercase tracking-wider transition-all shadow-sm ${
                  activeScreen === 'admin'
                    ? 'bg-[#914c00] text-[#ffa457] border border-[#6f3900]'
                    : 'bg-[#914c00] text-white hover:bg-brand-orange'
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
                <span>POS Manager</span>
              </button>
            )}

            {/* User Details & Login Options */}
            {currentUser ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setScreen('profile')}
                  className={`w-9 h-9 rounded-full bg-white/10 flex items-center justify-center border border-white/20 transition hover:bg-white/20 cursor-pointer ${
                    activeScreen === 'profile' ? 'border-brand-orange ring-1 ring-brand-orange' : ''
                  }`}
                  title="My Profile & Addresses"
                >
                  <UserIcon className="w-4 h-4 text-brand-orange-hover" />
                </button>
                <button
                  onClick={onLogout}
                  className="p-2 text-zinc-400 hover:text-red-400 transition cursor-pointer"
                  title="Logout"
                >
                  <LogOut className="w-4.5 h-4.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="bg-brand-orange hover:bg-brand-orange-hover text-white py-2 px-4 rounded font-serif text-sm font-semibold tracking-wide transition-all shadow-md flex items-center gap-1 cursor-pointer"
              >
                Sign In
              </button>
            )}

            {/* Interactive Cart trigger */}
            <button
              onClick={onOpenCart}
              className="relative p-2.5 rounded-full bg-brand-green-hover border border-white/10 hover:border-brand-orange/40 hover:text-brand-orange transition-all cursor-pointer shadow-md group"
            >
              <ShoppingBag className="w-5 h-5 text-white group-hover:text-[#ffa457]" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1.5 w-5 h-5 bg-[#ffa457] text-[#6f3900] text-[10px] font-black font-mono rounded-full flex items-center justify-center animate-pulse">
                  {cartCount}
                </span>
              )}
            </button>

          </div>
        </div>
      </div>
    </header>
  );
}
