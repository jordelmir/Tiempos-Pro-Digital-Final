import { create } from 'zustand';
import { DrawTime, GameMode } from '../types';

export interface CartItem {
    id: string;
    number: string;
    amount: number;
    gameMode: GameMode;
    drawTime: DrawTime;
}

interface BetState {
    cart: CartItem[];
    addToCart: (item: Omit<CartItem, 'id'>) => void;
    removeFromCart: (id: string) => void;
    clearCart: () => void;
    totalAmount: () => number;
}

export const useBetStore = create<BetState>((set, get) => ({
    cart: [],
    addToCart: (item) => {
        const newItem = { ...item, id: `item-${Date.now()}-${Math.random()}` };
        set((state) => ({ cart: [...state.cart, newItem] }));
    },
    removeFromCart: (id) => {
        set((state) => ({ cart: state.cart.filter((i) => i.id !== id) }));
    },
    clearCart: () => set({ cart: [] }),
    totalAmount: () => {
        return get().cart.reduce((sum, item) => sum + item.amount, 0);
    }
}));
