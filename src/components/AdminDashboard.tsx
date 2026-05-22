import React, { useState, useEffect } from 'react';
import { TrendingUp, ShoppingBag, Truck, DollarSign } from 'lucide-react';

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/admin/analytics')
      .then(res => res.json())
      .then(setData)
      .catch(console.error);
  }, []);

  if (!data) return <div className="p-8 text-center">Loading Analytics...</div>;

  return (
    <div className="p-8 space-y-6">
      <h2 className="text-2xl font-bold text-brand-green flex items-center gap-2">
        <TrendingUp className="w-6 h-6 text-brand-orange" /> Admin Dashboard
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3 text-emerald-600 mb-2">
            <DollarSign className="w-5 h-5" />
            <h3 className="font-bold">Revenue Today</h3>
          </div>
          <p className="text-3xl font-black">₱{parseFloat(data.totalRevenueToday || 0).toFixed(2)}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3 text-blue-600 mb-2">
            <Truck className="w-5 h-5" />
            <h3 className="font-bold">Active Delivery Queues</h3>
          </div>
          <p className="text-3xl font-black">{data.activeDeliveryQueues}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-brand-orange" /> Top Popular Items
        </h3>
        <div className="space-y-2">
          {data.popularItems?.map((item: any) => (
            <div key={item.name} className="flex justify-between p-3 bg-gray-50 rounded">
              <span className="font-medium">{item.name}</span>
              <span className="font-bold text-brand-green">{item.totalSold} sold</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
