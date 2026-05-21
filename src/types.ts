export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'customer';
  loyaltyPoints: number;
  isOnline: boolean;
  address?: string;
  lat?: number;
  lng?: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'burgers' | 'pasta' | 'sides' | 'rice-meals' | 'chicken' | 'drinks';
  imageUrl: string;
  bestSeller?: boolean;
  signature?: boolean;
}

export interface OrderItem {
  menuItemId: string;
  name: string;
  price: number;
  qty: number;
  customizations?: {
    pattyDone?: 'Medium Rare' | 'Medium' | 'Well Done';
    noOnions?: boolean;
    extraSauce?: boolean;
    notes?: string;
  };
}

export interface Order {
  id: string;
  userId: string;
  customerName: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee?: number;
  distance?: number;
  total: number;
  status: 'received' | 'preparing' | 'ready' | 'delivering' | 'complete' | 'cancelled';
  createdAt: string;
  estimatedMinutes: number;
  paymentMethod: 'delivery' | 'counter' | 'gcash' | 'card';
  address?: string;
  lat?: number;
  lng?: number;
  rating?: number;
  feedback?: string;
}

export interface Feedback {
  id: string;
  customerName: string;
  rating: number;
  comment: string;
  createdAt: string;
}
