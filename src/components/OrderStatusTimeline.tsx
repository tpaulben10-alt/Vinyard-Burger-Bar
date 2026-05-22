import React, { useState, useEffect } from 'react';
import { Inbox, ChefHat, Truck, CheckCircle, XCircle } from 'lucide-react';

interface OrderStatusTimelineProps {
  status: string;
  createdAt: string;
  estimatedMinutes: number;
}

export default function OrderStatusTimeline({ status, createdAt, estimatedMinutes }: OrderStatusTimelineProps) {
  const steps = [
    { value: 'received', label: 'RECEIVED', icon: Inbox },
    { value: 'preparing', label: 'PREPARING', icon: ChefHat },
    { value: 'delivering', label: 'DELIVERING', icon: Truck },
    { value: 'complete', label: 'COMPLETE', icon: CheckCircle },
  ];

  if (status === 'cancelled') {
    return (
      <div className="flex items-center gap-2 text-red-600 font-bold font-mono text-xs">
        <XCircle className="w-4 h-4" /> Order Cancelled
      </div>
    );
  }

  const currentStep = steps.findIndex(s => s.value === status);
  
  // Countdown Timer logic
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (status === 'complete' || status === 'cancelled') return;

    const interval = setInterval(() => {
      const created = new Date(createdAt).getTime();
      const endTime = created + (estimatedMinutes * 60 * 1000);
      const now = new Date().getTime();
      const diff = endTime - now;

      if (diff <= 0) {
        setTimeLeft('Should be ready!');
        clearInterval(interval);
      } else {
        const mins = Math.floor(diff / 1000 / 60);
        const secs = Math.floor((diff / 1000) % 60);
        setTimeLeft(`${mins}m ${secs}s remaining`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [status, createdAt, estimatedMinutes]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = index <= currentStep;
          return (
            <div key={step.value} className="flex flex-col items-center gap-1.5 ">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${isActive ? 'bg-brand-green border-brand-green text-white' : 'bg-white border-gray-200 text-gray-300'}`}>
                <Icon className="w-4 h-4" />
              </div>
              <span className={`text-[9px] font-mono font-bold ${isActive ? 'text-brand-green' : 'text-gray-300'}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
      
      {/* Progress Bar Line */}
      <div className="relative h-1 bg-gray-200 rounded-full">
        <div 
          className="absolute h-full bg-brand-green rounded-full transition-all duration-500"
          style={{ width: `${(Math.max(0, currentStep) / (steps.length - 1)) * 100}%` }}
        />
      </div>

      {timeLeft && (
        <div className="text-center text-[10px] font-mono text-brand-orange font-bold">
          Estimated Time Remaining: {timeLeft}
        </div>
      )}
    </div>
  );
}
