import React, { useEffect, useState } from 'react';
import { Feedback, MenuItem } from '../types';
import { ArrowRight, MapPin, Contact, Clock, Facebook, Star, Quote, Sparkles, Award } from 'lucide-react';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';

interface HomeHeroProps {
  onOrderClick: () => void;
  onFeaturedClick: (itemId: string) => void;
}

const MAPS_API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  '';

const isMapKeyConfigured = Boolean(MAPS_API_KEY) && MAPS_API_KEY !== 'YOUR_API_KEY';

export default function HomeHero({ onOrderClick, onFeaturedClick }: HomeHeroProps) {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [averageScore, setAverageScore] = useState(5.0);

  useEffect(() => {
    fetch('/api/feedback')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setFeedbacks(data);
          const total = data.reduce((sum, item) => sum + item.rating, 0);
          setAverageScore(data.length ? Number((total / data.length).toFixed(1)) : 5.0);
        }
      })
      .catch(err => console.error("Could not fetch feedback database", err));
  }, []);

  return (
    <div className="space-y-16 pb-16">
      
      {/* 1. HERO STORY BOARD */}
      <section className="relative bg-brand-green text-white min-h-[520px] rounded-2xl overflow-hidden shadow-xl flex items-center p-8 sm:p-12 md:p-16 rustic-wood-texture border border-brand-green-hover mb-6">
        {/* Abstract design light layers */}
        <div className="absolute inset-0 bg-gradient-to-r from-brand-green via-brand-green/95 to-brand-green/30 z-10"></div>
        <div 
          className="absolute inset-0 bg-cover bg-center mix-blend-overlay opacity-30"
          style={{ backgroundImage: `url('https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=1200')` }}
        ></div>

        <div className="relative z-20 max-w-2xl space-y-6">
          <div className="inline-flex items-center gap-1.5 bg-amber-500/10 text-[#ffa457] border border-brand-orange/40 rounded-full px-3 py-1 font-mono text-xs font-semibold uppercase tracking-widest leading-none">
            <Sparkles className="w-3.5 h-3.5" />
            <span>The Premium Smash Burger Experience</span>
          </div>

          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white leading-tight">
            Vinyard <br className="hidden sm:inline" />
            <span className="text-brand-orange-hover">Burger Bar</span>
          </h1>

          <p className="text-zinc-300 font-sans text-base sm:text-lg leading-relaxed max-w-xl">
            Sizzling premium hand-smashed beef patties, melted aged cheddar, secret house-spread, and buttery artisanal buns toasted to a crunch. Proudly serving Hinunangan, Southern Leyte since 2020.
          </p>

          <div className="pt-2 flex flex-wrap gap-4">
            <button
              onClick={onOrderClick}
              className="bg-brand-orange hover:bg-brand-orange-hover text-white py-3 px-7 rounded font-serif font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer border border-[#6f3900] active:scale-98"
            >
              Order Now
              <ArrowRight className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 text-zinc-300 font-mono text-xs font-semibold cursor-default">
              <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-ping"></span>
              <span>KITCHEN IS ACTIVE & TAKING INCOMING QUEUES</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. LOYALTY PROGRAM BENTO BADGE */}
      <section className="bg-gradient-to-br from-zinc-50 to-zinc-100 border border-brand-green/5 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 bg-brand-orange/10 rounded-full flex items-center justify-center text-brand-orange">
            <Award className="w-10 h-10" />
          </div>
          <div>
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-brand-green">Vinyard Loyalty Club</h3>
            <p className="text-sm text-gray-500 max-w-md mt-1">
              Earn <span className="font-bold text-brand-orange font-mono">10 points for every dollar spent</span>. Accumulate points and redeem discounts on subsequent orders. Double boost for online checkouts!
            </p>
          </div>
        </div>
        <div className="flex flex-col items-center sm:items-end gap-1.5">
          <div className="text-2xl font-mono font-bold text-brand-green">100 WELCOME PTS</div>
          <span className="text-xs uppercase font-mono tracking-wider text-brand-green/60">Credited automatically at sign-up</span>
        </div>
      </section>

      {/* 3. SIGNATURE HIGHLIGHT PANELS */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-gray-200 pb-3">
          <div>
            <span className="font-mono text-xs uppercase text-brand-orange font-bold tracking-widest block">Signature Chef Selection</span>
            <h2 className="font-serif text-3xl font-bold text-brand-green">House Favorites</h2>
          </div>
          <button 
            onClick={onOrderClick} 
            className="text-sm text-brand-orange hover:text-[#ffa457] font-mono font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer"
          >
            Full Menu <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Classic Highlight */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all flex flex-col sm:flex-row group lg:h-60">
            <div className="sm:w-5/12 h-44 sm:h-auto overflow-hidden relative">
              <img 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuC0O_m-FBiO5weZPAwzib9ekLQVPNj0zovabFu70uBmxIxAr0cmep4NUIygouLjOK-UeTXwMqglMWAni46FjsJTVDwPVkZEtK6I-fQA8POXAyBH8Hxjjx3JRqf-VP1KoOHCEVuIdUCT6fq8YaxsohEWQC6KUrL-qizokDA17YaS4EQYuvNlWwxMD7HGzSeOyK0J7ptoa-YADK2uEuFp69mD_qCmv61TavAJBqVXSMwMRGzMuz4sUTnElEzX19udF5YDQKGMyVkxSF8" 
                alt="The Vinyard Classic"
                className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-3 left-3 bg-brand-green text-white font-mono text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
                Signature
              </div>
            </div>
            <div className="p-6 sm:w-7/12 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-serif text-lg font-bold text-brand-green">The Vinyard Classic</h3>
                  <span className="font-mono text-sm font-bold text-brand-orange">$14.50</span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed font-sans">
                  Our centerpiece smash. Double premium beef patties, aged cheddar, lettuce, organic tomato, and special burger vinaigrette on a soft potato roll.
                </p>
              </div>
              <button 
                onClick={() => onFeaturedClick('vinyard-classic')}
                className="mt-4 w-full py-2 border border-brand-green/15 text-brand-green hover:bg-brand-green hover:text-white rounded text-xs font-serif font-bold transition-all cursor-pointer"
              >
                SELECT & CUSTOMIZE
              </button>
            </div>
          </div>

          {/* BBQ Highlight */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all flex flex-col sm:flex-row group lg:h-60">
            <div className="sm:w-5/12 h-44 sm:h-auto overflow-hidden relative">
              <img 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDix3J03byQ6JqTySDIhFwnbc7rgYPweYbckmcrvS7YGsBi6f-rxPvT8QLExpOTJ47CrVuCN5jfr5-zu-l8t_91zuT5n2Fwx50rKF-hTAszkyP5WROMF3XoJ0dVobbykGyIxTEjBPUjBz3dYjUS3oWkcb059CbTpxS-KO86oxwsl8dHlyWnaOVIC8o9MoMFhnoaeVG7rBRhuTb27PIRLOzPlUANMJqrgkzp2vOz49n4Vn3wf4nyIEXwaeYCSsDmZREqGRmYYQZ2ij4" 
                alt="Smokehouse BBQ"
                className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-3 left-3 bg-brand-green text-white font-mono text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
                Signature
              </div>
            </div>
            <div className="p-6 sm:w-7/12 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-serif text-lg font-bold text-brand-green">Smokehouse BBQ</h3>
                  <span className="font-mono text-sm font-bold text-brand-orange">$16.00</span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed font-sans">
                  Crisptastic local bacon, golden onion strings, heavy provolone cheese, and genuine hickory BBQ glaze. Smoky and sweet.
                </p>
              </div>
              <button 
                onClick={() => onFeaturedClick('smokehouse-bbq')}
                className="mt-4 w-full py-2 border border-brand-green/15 text-brand-green hover:bg-brand-green hover:text-white rounded text-xs font-serif font-bold transition-all cursor-pointer"
              >
                SELECT & CUSTOMIZE
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 4. ADDRESS / CONTACT / MAP INTEGRATION */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
        
        {/* Contact/Location Details Card */}
        <div className="md:col-span-5 bg-white border border-gray-200 rounded-xl p-6 sm:p-8 space-y-6 flex flex-col justify-between">
          <div className="space-y-2">
            <span className="font-mono text-xs uppercase text-[#ffa457] font-bold bg-[#914c00]/10 px-2.5 py-1 rounded-full border border-brand-orange/10 inline-block">FIND US HERE</span>
            <h2 className="font-serif text-3xl font-bold text-brand-green">Our Headquarters</h2>
            <p className="text-sm text-gray-500">
              Vinyard Burger Bar welcomes you in our rustic beachside kitchen in Catmonan St. Grab a seat or book real-time local delivery!
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 bg-brand-green/5 text-brand-green rounded-full flex items-center justify-center shrink-0 border border-brand-green/10">
                <MapPin className="w-4 h-4 text-brand-orange" />
              </div>
              <div>
                <h4 className="font-serif text-sm font-bold text-brand-green">Store Location</h4>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  Catmonan St., Poblacion, Hinunangan,<br />
                  Southern Leyte, Philippines, 6608
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 bg-brand-green/5 text-brand-green rounded-full flex items-center justify-center shrink-0 border border-brand-green/10">
                <Contact className="w-4 h-4 text-brand-orange" />
              </div>
              <div>
                <h4 className="font-serif text-sm font-bold text-brand-green">Direct Hotline</h4>
                <p className="text-xs text-gray-500 font-mono mt-0.5">0912 043 1891</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 bg-brand-green/5 text-brand-green rounded-full flex items-center justify-center shrink-0 border border-brand-green/10">
                <Clock className="w-4 h-4 text-brand-orange" />
              </div>
              <div>
                <h4 className="font-serif text-sm font-bold text-brand-green">Service Hours</h4>
                <p className="text-xs text-gray-500 mt-0.5 font-mono">Mon - Sun: 10:00 AM - 9:00 PM</p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-5 flex items-center justify-between">
            <a 
              href="https://www.facebook.com/profile.php?id=100092581604391" 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center gap-2 text-xs font-mono font-bold text-brand-green hover:text-brand-orange transition-all"
            >
              <Facebook className="w-4 h-4 text-[#1877F2]" />
              <span>FOLLOW US ON FACEBOOK</span>
            </a>
          </div>
        </div>

        {/* Dynamic Map Frame Component */}
        <div className="md:col-span-7 h-[350px] md:h-auto min-h-[350px] rounded-xl overflow-hidden border border-gray-200 relative bg-zinc-100">
          {isMapKeyConfigured ? (
            <APIProvider apiKey={MAPS_API_KEY} version="weekly">
              <Map
                defaultCenter={{ lat: 10.3971559, lng: 125.1983495 }}
                defaultZoom={15}
                mapId="VINYARD_MAP_HQ"
                internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                style={{ width: '100%', height: '100%' }}
              >
                <AdvancedMarker position={{ lat: 10.3971559, lng: 125.1983495 }} title="Vinyard Burger Bar">
                  <Pin background="#012d1d" borderColor="#ffa457" glyphColor="#ffffff" />
                </AdvancedMarker>
              </Map>
            </APIProvider>
          ) : (
            <div className="w-full h-full flex flex-col justify-between p-6 bg-slate-900 text-white relative">
              {/* Simulated visual layout */}
              <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40"></div>
              
              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-brand-orange animate-bounce" />
                  <span className="font-serif text-lg font-bold">Vinyard HQ Coordinates Mapping</span>
                </div>
                <div className="p-3 bg-white/5 rounded border border-white/15 space-y-1 font-mono text-xs text-zinc-300">
                  <p>📍 Latitude: <span className="text-brand-orange-hover">10.3971559</span></p>
                  <p>📍 Longitude: <span className="text-brand-orange-hover">125.1983495</span></p>
                  <p>🌎 Catmonan St., Poblacion , Hinunangan</p>
                </div>
              </div>

              {/* Instructions banner for setting Google Maps key */}
              <div className="relative z-10 bg-white/10 backdrop-blur border border-white/15 p-4 rounded text-xs space-y-2">
                <p className="font-bold text-[#ffa457]">Want to view our actual Google Maps live?</p>
                <p className="text-zinc-300 leading-relaxed text-[11px]">
                  Add your <code>GOOGLE_MAPS_PLATFORM_KEY</code> in the <strong>AI Studio Settings</strong> (⚙️ gear icon, top-right) → <strong>Secrets</strong> panel. The app will auto-inject the Google Maps Provider instantly!
                </p>
                <p className="text-[11px] text-zinc-400">
                  You can still place delivery pins and route orders via coordinates simulation flawlessly!
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 5. GUEST FEEDBACK & REVIEWS HUBS */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-baseline gap-2 border-b border-gray-200 pb-3">
          <div>
            <span className="font-mono text-xs uppercase text-brand-orange font-bold tracking-widest block">CUSTOMER CHANNELS</span>
            <h2 className="font-serif text-3xl font-bold text-brand-green">Guest Ratings</h2>
          </div>
          <div className="flex items-center gap-2 bg-brand-green/5 px-3.5 py-1.5 rounded-full border border-brand-green/10 text-brand-green text-sm font-semibold">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>AVG: <span className="font-mono">{averageScore}</span> / 5.0 Rating Stars</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {feedbacks.length === 0 ? (
            <div className="col-span-3 py-10 text-center text-gray-400 font-mono text-sm border-2 border-dashed border-gray-200 rounded-xl">
              No testimonials shared yet. Completed order accounts leave review comments!
            </div>
          ) : (
            feedbacks.slice(0, 6).map((item) => (
              <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col justify-between shadow-sm relative hover:border-gray-300 transition-all">
                <Quote className="absolute top-4 right-4 w-10 h-10 text-brand-green/5 select-none" />
                <div className="space-y-4">
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`w-4 h-4 ${
                          i < item.rating 
                            ? 'text-amber-500 fill-amber-500' 
                            : 'text-gray-200'
                        }`} 
                      />
                    ))}
                  </div>
                  <p className="text-zinc-600 font-sans text-sm italic leading-relaxed">
                    "{item.comment}"
                  </p>
                </div>
                
                <div className="mt-5 border-t border-gray-100 pt-4 flex justify-between items-center text-xs">
                  <span className="font-serif font-bold text-brand-green">{item.customerName}</span>
                  <span className="font-mono text-gray-400">{new Date(item.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

    </div>
  );
}
