'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface CartItem {
  cartItemId: string; // Unique ID: campaign-{id} or qurban-{packagePeriodId} or zakat-{type}
  itemType: 'campaign' | 'qurban' | 'zakat';
  campaignId: string;
  slug: string;
  title: string;
  amount: number;
  category?: string;
  pillar?: string;
  programType: string;
  organizationName?: string;
  // Qurban-specific fields
  qurbanData?: {
    packagePeriodId: string; // Primary identifier for package-period combination
    packageId: string; // Legacy field for compatibility
    periodId: string;
    periodName: string;
    quantity: number;
    animalType: string;
    packageType: string;
    price: number;
    adminFee: number;
  };
  // Zakat-specific fields
  zakatData?: {
    zakatType: string; // fitrah, maal, profesi, pertanian, peternakan
    zakatTypeId?: string;
    zakatTypeSlug?: string;
    quantity?: number;
    pricePerUnit?: number;
    periodId?: string;
  };
  // Fidyah-specific fields
  fidyahData?: {
    personCount: number;
    dayCount: number;
  };
}

interface CartContextType {
  items: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (cartItemId: string) => void;
  updateCartItem: (cartItemId: string, updates: Partial<CartItem>) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getCartCount: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'bantuanku_cart';

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        setItems(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load cart from localStorage:', error);
    }
    setIsLoaded(true);
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
      } catch (error) {
        console.error('Failed to save cart to localStorage:', error);
      }
    }
  }, [items, isLoaded]);

  const addToCart = (item: CartItem) => {
    setItems((prevItems) => {
      // Check if item already exists by cartItemId
      const existingIndex = prevItems.findIndex((i) => i.cartItemId === item.cartItemId);

      if (existingIndex >= 0) {
        // Update existing item
        const newItems = [...prevItems];
        newItems[existingIndex] = item;
        return newItems;
      } else {
        // Add new item
        return [...prevItems, item];
      }
    });
  };

  const removeFromCart = (cartItemId: string) => {
    setItems((prevItems) => prevItems.filter((i) => i.cartItemId !== cartItemId));
  };

  const updateCartItem = (cartItemId: string, updates: Partial<CartItem>) => {
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.cartItemId === cartItemId ? { ...item, ...updates } : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const getCartTotal = () => {
    return items.reduce((total, item) => total + item.amount, 0);
  };

  const getCartCount = () => {
    return items.length;
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateCartItem,
        clearCart,
        getCartTotal,
        getCartCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
