import { create } from "zustand";
import { persist } from "zustand/middleware";
import { STORAGE_KEYS } from "@/constants";

export interface CartItemProduct {
  id: string;
  name: string;
  thumbnail: string;
  sale_price: number;
  business_owner_name: string;
}

export interface CartItemOption {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface CartItem {
  product: CartItemProduct;
  participants: number;
  reservationDate: string;
  reservationTime?: string;
  options?: CartItemOption[];
}

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateItem: (productId: string, updates: Partial<Omit<CartItem, "product">>) => void;
  clearCart: () => void;
  getTotalAmount: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) =>
        set((state) => {
          const existingIndex = state.items.findIndex(
            (i) => i.product.id === item.product.id
          );
          if (existingIndex > -1) {
            const newItems = [...state.items];
            newItems[existingIndex] = item;
            return { items: newItems };
          }
          return { items: [...state.items, item] };
        }),
      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((item) => item.product.id !== productId),
        })),
      updateItem: (productId, updates) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.product.id === productId ? { ...item, ...updates } : item
          ),
        })),
      clearCart: () => set({ items: [] }),
      getTotalAmount: () => {
        const { items } = get();
        return items.reduce((total, item) => {
          let itemTotal = item.product.sale_price * item.participants;
          if (item.options) {
            item.options.forEach((opt) => {
              itemTotal += opt.price * opt.quantity;
            });
          }
          return total + itemTotal;
        }, 0);
      },
      getItemCount: () => get().items.length,
    }),
    {
      name: STORAGE_KEYS.CART,
    }
  )
);
