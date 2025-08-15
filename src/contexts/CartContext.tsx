import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, Cart } from '@/types/cart';
import { useToast } from '@/hooks/use-toast';

interface CartContextType {
  cart: Cart;
  addToCart: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  isInCart: (productId: string) => boolean;
  getItemQuantity: (productId: string) => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

interface CartProviderProps {
  children: React.ReactNode;
}

const CART_STORAGE_KEY = 'shopping-cart';

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const [cart, setCart] = useState<Cart>({
    items: [],
    total: 0,
    itemCount: 0,
  });
  const { toast } = useToast();

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart);
        setCart(parsedCart);
      }
    } catch (error) {
      console.error('Error loading cart from localStorage:', error);
      // Clear invalid cart data
      localStorage.removeItem(CART_STORAGE_KEY);
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (error) {
      console.error('Error saving cart to localStorage:', error);
    }
  }, [cart]);

  // Calculate cart totals
  const calculateTotals = (items: CartItem[]): { total: number; itemCount: number } => {
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const itemCount = items.reduce((count, item) => count + item.quantity, 0);
    return { total, itemCount };
  };

  const addToCart = (item: Omit<CartItem, 'quantity'>, quantity: number = 1) => {
    try {
      setCart(prevCart => {
        const existingItemIndex = prevCart.items.findIndex(
          cartItem => cartItem.productId === item.productId
        );

        let newItems: CartItem[];

        if (existingItemIndex >= 0) {
          // Item already in cart, update quantity
          const existingItem = prevCart.items[existingItemIndex];
          const newQuantity = existingItem.quantity + quantity;
          
          // Check stock limit
          if (newQuantity > existingItem.maxStock) {
            toast({
              title: 'Stock Limit Reached',
              description: `Only ${existingItem.maxStock} items available in stock.`,
              variant: 'destructive',
            });
            return prevCart;
          }

          newItems = prevCart.items.map((cartItem, index) =>
            index === existingItemIndex
              ? { ...cartItem, quantity: newQuantity }
              : cartItem
          );
        } else {
          // New item, add to cart
          if (quantity > item.maxStock) {
            toast({
              title: 'Stock Limit Exceeded',
              description: `Only ${item.maxStock} items available in stock.`,
              variant: 'destructive',
            });
            return prevCart;
          }

          const newItem: CartItem = {
            ...item,
            quantity,
          };
          newItems = [...prevCart.items, newItem];
        }

        const { total, itemCount } = calculateTotals(newItems);

        toast({
          title: 'Added to Cart',
          description: `${item.title} has been added to your cart.`,
        });

        return {
          items: newItems,
          total,
          itemCount,
        };
      });
    } catch (error) {
      console.error('Error adding item to cart:', error);
      toast({
        title: 'Error',
        description: 'Failed to add item to cart. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const removeFromCart = (productId: string) => {
    try {
      setCart(prevCart => {
        const newItems = prevCart.items.filter(item => item.productId !== productId);
        const { total, itemCount } = calculateTotals(newItems);

        const removedItem = prevCart.items.find(item => item.productId === productId);
        if (removedItem) {
          toast({
            title: 'Removed from Cart',
            description: `${removedItem.title} has been removed from your cart.`,
          });
        }

        return {
          items: newItems,
          total,
          itemCount,
        };
      });
    } catch (error) {
      console.error('Error removing item from cart:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove item from cart. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const updateQuantity = (productId: string, quantity: number) => {
    try {
      if (quantity < 1) {
        removeFromCart(productId);
        return;
      }

      setCart(prevCart => {
        const newItems = prevCart.items.map(item => {
          if (item.productId === productId) {
            // Check stock limit
            if (quantity > item.maxStock) {
              toast({
                title: 'Stock Limit Exceeded',
                description: `Only ${item.maxStock} items available in stock.`,
                variant: 'destructive',
              });
              return item;
            }
            return { ...item, quantity };
          }
          return item;
        });

        const { total, itemCount } = calculateTotals(newItems);

        return {
          items: newItems,
          total,
          itemCount,
        };
      });
    } catch (error) {
      console.error('Error updating cart quantity:', error);
      toast({
        title: 'Error',
        description: 'Failed to update quantity. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const clearCart = () => {
    try {
      setCart({
        items: [],
        total: 0,
        itemCount: 0,
      });

      toast({
        title: 'Cart Cleared',
        description: 'All items have been removed from your cart.',
      });
    } catch (error) {
      console.error('Error clearing cart:', error);
      toast({
        title: 'Error',
        description: 'Failed to clear cart. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const isInCart = (productId: string): boolean => {
    return cart.items.some(item => item.productId === productId);
  };

  const getItemQuantity = (productId: string): number => {
    const item = cart.items.find(item => item.productId === productId);
    return item ? item.quantity : 0;
  };

  const value = {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    isInCart,
    getItemQuantity,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};