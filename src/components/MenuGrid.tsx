import React, { useState, useEffect } from 'react';
import { MenuItem, OrderItem } from '../types';
import { Sparkles, Heart, Check, Plus, Minus, X, MessageSquare, Award, Clock, Flame, Zap } from 'lucide-react';

interface MenuGridProps {
  onAddToTray: (item: OrderItem) => void;
  quickSelectId: string | null;
  resetQuickSelect: () => void;
  availableLoyaltyPoints: number;
}

export default function MenuGrid({
  onAddToTray,
  quickSelectId,
  resetQuickSelect,
  availableLoyaltyPoints
}: MenuGridProps) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<'all' | 'popular' | 'new-arrival' | 'favorites' | 'burgers' | 'pasta' | 'sides' | 'rice-meals' | 'chicken' | 'drinks' | string>('all');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  
  // Real sales statistics from historical orders Database
  const [salesCounts, setSalesCounts] = useState<Record<string, number>>({});
  const [popularItemIds, setPopularItemIds] = useState<Set<string>>(new Set());
  
  // Customization fields
  const [qty, setQty] = useState(1);
  const [pattyDone, setPattyDone] = useState<'Medium Rare' | 'Medium' | 'Well Done'>('Medium');
  const [noOnions, setNoOnions] = useState(false);
  const [extraSauce, setExtraSauce] = useState(false);
  const [notes, setNotes] = useState('');
  
  // To display add confirmation animation
  const [justAddedName, setJustAddedName] = useState('');

  useEffect(() => {
    fetch('/api/menu')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setMenuItems(data);
        }
      })
      .catch(err => console.error("Could not fetch menu data", err));
  }, []);

  // Fetch all historical orders to calculate real-time sales popularity rankings
  useEffect(() => {
    fetch('/api/orders')
      .then(res => res.json())
      .then(orders => {
        if (Array.isArray(orders)) {
          const counts: Record<string, number> = {};
          orders.forEach((order: any) => {
            if (order.status !== 'cancelled' && Array.isArray(order.items)) {
              order.items.forEach((item: any) => {
                counts[item.menuItemId] = (counts[item.menuItemId] || 0) + (item.qty || 1);
              });
            }
          });
          setSalesCounts(counts);

          // Find the top-selling items over 0 sales
          const sorted = Object.entries(counts)
            .filter(([_, qty]) => qty > 0)
            .sort((a, b) => b[1] - a[1]);

          // Set top 4 distinct items as popular
          const topPopular = new Set(sorted.slice(0, 4).map(([id]) => id));
          setPopularItemIds(topPopular);
        }
      })
      .catch(err => console.error("Could not fetch sales data from orders database", err));
  }, []);

  // Quick select trigger from Homepage feature clicks
  useEffect(() => {
    if (quickSelectId && menuItems.length > 0) {
      const match = menuItems.find(i => i.id === quickSelectId);
      if (match) {
        handleOpenCustomize(match);
      }
      resetQuickSelect();
    }
  }, [quickSelectId, menuItems]);

  const handleOpenCustomize = (item: MenuItem) => {
    setSelectedItem(item);
    setQty(1);
    setPattyDone('Medium');
    setNoOnions(false);
    setExtraSauce(false);
    setNotes('');
  };

  const handleCommitToTray = () => {
    if (!selectedItem) return;

    const cartItem: OrderItem = {
      menuItemId: selectedItem.id,
      name: selectedItem.name,
      price: selectedItem.price,
      qty,
      customizations: selectedItem.category === 'burgers' ? {
        pattyDone,
        noOnions,
        extraSauce,
        notes: notes.trim()
      } : {
        notes: notes.trim()
      }
    };

    onAddToTray(cartItem);
    setJustAddedName(`${qty}x ${selectedItem.name}`);
    setSelectedItem(null);

    // Timeout-fader for toast
    setTimeout(() => {
      setJustAddedName('');
    }, 3000);
  };

  const filteredItems = menuItems.filter(item => {
    if (activeCategory === 'all') return true;
    if (activeCategory === 'popular') return item.popular || popularItemIds.has(item.id) || item.bestSeller;
    if (activeCategory === 'new-arrival') return item.newArrival;
    return item.category === activeCategory;
  });

  const displayItems = activeCategory === 'favorites' 
    ? (JSON.parse(localStorage.getItem('favorites') || '[]') as OrderItem[]).map(fav => ({
      ...menuItems.find(mi => mi.id === fav.menuItemId) || { 
        id: fav.menuItemId,
        name: fav.name, 
        price: fav.price, 
        category: 'burgers', 
        imageUrl: '/src/assets/images/vinyard_storefront_1779375096734.png',
        description: 'Previously customized favorite item.'
      },
      ...fav
    }))
    : filteredItems;

  return (
    <div className="space-y-8 pb-12 relative">
      
      {/* Dynamic Tiny Toast confirmation */}
      {justAddedName && (
        <div className="fixed bottom-6 left-6 z-50 bg-brand-green text-white px-5 py-3.5 rounded-lg border border-[#ffa457]/50 shadow-2xl flex items-center gap-3 animate-bounce">
          <div className="w-5 h-5 bg-[#ffa457] text-[#6f3900] rounded-full flex items-center justify-center font-bold text-xs">✓</div>
          <span className="text-xs font-mono">Added <span className="font-bold text-[#ffa457]">{justAddedName}</span> to your tray successfully!</span>
        </div>
      )}

      {/* Categories Navigator */}
      <div className="flex flex-col gap-4 border-b border-gray-200 pb-5">
        <div>
          <span className="font-mono text-xs uppercase text-brand-orange font-bold tracking-widest block">BROWSE RECOLLECTIONS</span>
          <h1 className="font-serif text-3xl font-bold text-brand-green">Vinyard Cookhouse Catalog</h1>
        </div>

        <div className="flex flex-wrap gap-2">
          {['all', 'popular', 'new-arrival', 'favorites', 'burgers', 'pasta', 'sides', 'rice-meals', 'chicken', 'drinks'].map(cat => {
            const labels: Record<string, string> = {
              all: 'All Items 📋',
              popular: 'Popular 🔥',
              'new-arrival': 'New & Fresh ✨',
              favorites: 'Favorites ❤️',
              burgers: 'Burgers 🍔',
              pasta: 'Pasta & Noodles 🍝',
              sides: 'Sides & Appetizers 🍟',
              'rice-meals': 'Sizzling Meals 🍛',
              chicken: 'Flavored Chicken 🍗',
              drinks: 'Drinks & Coffee ☕'
            };
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat as any)}
                className={`px-4 py-2 rounded text-xs uppercase font-mono tracking-wider font-bold transition-all border cursor-pointer ${
                  activeCategory === cat
                    ? 'bg-brand-green border-brand-green text-white shadow-md'
                    : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                {labels[cat] || cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Menu Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayItems.map(item => (
          <div 
            key={item.id}
            className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col justify-between group h-full"
          >
            {/* Visual Header */}
            <div className="h-56 overflow-hidden relative bg-zinc-50">
              <img 
                src={item.imageUrl} 
                alt={item.name}
                className="w-full h-full object-cover group-hover:scale-102 transition-all duration-500"
                referrerPolicy="no-referrer"
              />
              {item.signature && (
                <span className="absolute top-4 left-4 bg-brand-green text-[#ffa457] text-[10px] uppercase font-mono font-bold px-2 py-1 rounded shadow select-none flex items-center gap-1 border border-brand-orange/20">
                  <Sparkles className="w-3 h-3 text-[#ffa457]" /> SIGNATURE
                </span>
              )}
              
              {/* Badges Stack on Top-Right */}
              <div className="absolute top-4 right-4 flex flex-col gap-1.5 items-end">
                {item.bestSeller && (
                  <span className="bg-brand-orange text-white text-[10px] uppercase font-mono font-bold px-2.5 py-1 rounded shadow select-none flex items-center gap-1">
                    ★ BEST SELLER
                  </span>
                )}
                {(item.popular || popularItemIds.has(item.id)) && (
                  <span className="bg-rose-500 text-white text-[10px] uppercase font-mono font-bold px-2.5 py-1 rounded shadow select-none flex items-center gap-1">
                    <Flame className="w-3 h-3 text-white fill-white" /> POPULAR {salesCounts[item.id] > 0 ? `(${salesCounts[item.id]} Sold)` : ''}
                  </span>
                )}
                {item.newArrival && (
                  <span className="bg-blue-600 text-white text-[10px] uppercase font-mono font-bold px-2.5 py-1 rounded shadow select-none flex items-center gap-1">
                    <Zap className="w-3 h-3 text-white fill-white" /> NEW ARRIVAL
                  </span>
                )}
              </div>
            </div>

            {/* Content body */}
            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-serif text-lg font-black text-brand-green group-hover:text-brand-orange transition-colors">
                    {item.name}
                  </h3>
                  <span className="font-mono text-base font-bold text-brand-orange shrink-0">
                    ₱{item.price.toFixed(2)}
                  </span>
                </div>
                <p className="text-gray-500 text-xs sm:text-xs leading-relaxed font-sans line-clamp-3">
                  {item.description}
                </p>
              </div>

              {/* Interaction details metrics */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-[10px] font-mono border-t border-gray-100 pt-3 text-gray-400">
                  <span className="flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-brand-orange" />
                    <span>+{Math.floor(item.price / 10)} PTS</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>~12 Mins Preparation</span>
                  </span>
                </div>

                <button
                  onClick={() => handleOpenCustomize(item)}
                  className="w-full py-2.5 bg-brand-green hover:bg-brand-green-hover text-white rounded font-serif text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4.5 h-4.5" />
                  <span>CUSTOMIZE & ADD</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Core customization Overlay dialog */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-brand-green/20">
            {/* Overlay Header */}
            <div className="p-6 bg-brand-green text-white flex justify-between items-center rustic-wood-texture border-b border-brand-green-hover">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#ffa457]">Configure parameters</span>
                <h3 className="font-serif text-xl font-bold">{selectedItem.name}</h3>
              </div>
              <button 
                onClick={() => setSelectedItem(null)}
                className="p-1 text-white/75 hover:text-white hover:bg-white/10 rounded transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable specs selection fields */}
            <div className="p-6 space-y-6 max-h-[420px] overflow-y-auto">
              {/* Quantities slider indicator */}
              <div className="space-y-2">
                <span className="text-xs uppercase font-mono font-bold text-gray-500 tracking-wider">Select Quantities</span>
                <div className="flex items-center gap-4">
                  <div className="flex items-center border border-gray-300 rounded overflow-hidden">
                    <button 
                      onClick={() => setQty(q => Math.max(1, q - 1))}
                      className="p-2.5 hover:bg-gray-50 text-gray-600 transition"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-12 text-center font-mono font-bold text-brand-green text-sm">{qty}</span>
                    <button 
                      onClick={() => setQty(q => q + 1)}
                      className="p-2.5 hover:bg-gray-50 text-gray-600 transition"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-xs text-gray-400 font-mono">
                    Total Portion: <span className="text-brand-orange font-bold">₱{(selectedItem.price * qty).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Burger Customization Fields */}
              {selectedItem.category === 'burgers' && (
                <div className="space-y-4 border-t border-gray-100 pt-4">
                  {/* Patio doneness */}
                  <div className="space-y-2">
                    <span className="text-xs uppercase font-mono font-bold text-gray-500 tracking-wider">Patty Doneness</span>
                    <div className="grid grid-cols-3 gap-2">
                      {['Medium Rare', 'Medium', 'Well Done'].map((level) => (
                        <button
                          key={level}
                          onClick={() => setPattyDone(level as any)}
                          className={`py-2 px-3 text-xs font-mono font-medium rounded border transition ${
                            pattyDone === level
                              ? 'border-brand-green bg-brand-green/5 text-brand-green font-bold'
                              : 'border-gray-200 text-gray-500 hover:border-gray-300'
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Addons toggles */}
                  <div className="space-y-2.5">
                    <span className="text-xs uppercase font-mono font-bold text-gray-500 tracking-wider">Personal Preferences</span>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex items-center gap-2.5 p-3 rounded border border-gray-100 hover:bg-zinc-50 cursor-pointer text-xs font-medium">
                        <input
                          type="checkbox"
                          checked={noOnions}
                          onChange={(e) => setNoOnions(e.target.checked)}
                          className="w-4 h-4 accent-brand-green"
                        />
                        <span>No Raw Onions</span>
                      </label>
                      <label className="flex items-center gap-2.5 p-3 rounded border border-gray-100 hover:bg-zinc-50 cursor-pointer text-xs font-medium">
                        <input
                          type="checkbox"
                          checked={extraSauce}
                          onChange={(e) => setExtraSauce(e.target.checked)}
                          className="w-4 h-4 accent-brand-green"
                        />
                        <span>Extra Signature Sauce</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* General custom Notes fields */}
              <div className="space-y-2 border-t border-gray-100 pt-4">
                <span className="text-xs uppercase font-mono font-bold text-gray-500 tracking-wider flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5" /> Special Prep Instructions
                </span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., sauce on the side, well-toasted buns, allergy notices..."
                  className="w-full text-xs p-3 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-orange h-20 resize-none font-sans"
                />
              </div>
            </div>

            {/* Overlay Footer action buttons */}
            <div className="p-6 bg-zinc-50 border-t border-gray-200 flex items-center justify-between gap-4">
              <div className="font-mono">
                <span className="block text-[10px] text-gray-400 font-bold uppercase">Estimated Earn</span>
                <span className="text-xs text-brand-green font-bold">⭐ {Math.floor(selectedItem.price * qty / 10)} Loyalty PTS</span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedItem(null)}
                  className="px-4 py-2.5 bg-white border border-gray-300 text-gray-500 rounded text-xs transition cursor-pointer hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCommitToTray}
                  className="px-5 py-2.5 bg-brand-orange hover:bg-brand-orange-hover text-white rounded font-serif font-bold text-xs transition uppercase shadow flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Add To Tray</span>
                  <span className="font-mono text-[11px] font-black bg-white/20 px-1.5 py-0.5 rounded">₱{(selectedItem.price * qty).toFixed(2)}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
