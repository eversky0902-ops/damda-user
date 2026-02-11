import { create } from "zustand";
import { persist } from "zustand/middleware";
import { STORAGE_KEYS } from "@/constants";

export interface CartItemProduct {
  id: string;
  name: string;
  thumbnail: string;
  original_price: number;
  sale_price: number;
  business_owner_name: string;
  min_participants: number;
  max_participants: number;
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
  directItem: CartItem | null; // 바로예약 전용 (장바구니에 담지 않음)
  selectedItemIds: string[]; // 장바구니에서 결제할 상품 선택
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateItem: (productId: string, updates: Partial<Omit<CartItem, "product">>) => void;
  clearCart: () => void;
  setDirectItem: (item: CartItem) => void; // 바로예약용
  clearDirectItem: () => void;
  setSelectedItemIds: (ids: string[]) => void;
  getTotalAmount: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      directItem: null,
      selectedItemIds: [],
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
      setDirectItem: (item) => set({ directItem: item }),
      clearDirectItem: () => set({ directItem: null }),
      setSelectedItemIds: (ids) => set({ selectedItemIds: ids }),
      getTotalAmount: () => {
        const { items, directItem } = get();
        // 바로예약 아이템이 있으면 해당 금액만 계산
        const targetItems = directItem ? [directItem] : items;
        return targetItems.reduce((total, item) => {
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
