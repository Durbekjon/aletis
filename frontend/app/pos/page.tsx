'use client';

import { useState, useEffect } from 'react';
import { productsApi } from '@/src/api/productsApi';
import { posApi } from '@/src/api/posApi';
import type { BackendProduct } from '@/lib/types/product';
import { Loader2, Plus, Minus, Trash2 } from 'lucide-react';
import { useBarcodeScanner } from '@/src/hooks/useBarcodeScanner';

interface CartItem extends BackendProduct {
  cartQuantity: number;
}

export default function PosPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<BackendProduct[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const getImageUrl = (img?: { url?: string }) => {
    if (img?.url) {
      return /^https?:\/\//i.test(img.url)
        ? img.url
        : `${process.env.NEXT_PUBLIC_BACKEND_URL || ''}/${img.url}`;
    }
    return '/placeholder.svg?height=200&width=200';
  };

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const res = await productsApi.getProducts({ limit: 50, search: searchQuery });
        setProducts(res.items);
      } catch (error) {
        console.error('Failed to fetch products', error);
      } finally {
        setLoading(false);
      }
    };
    
    // Simple debounce
    const timeout = setTimeout(fetchProducts, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  // Global barcode scanner integration
  useBarcodeScanner({
    onScan: async (barcode) => {
      // Find product by barcode via API
      try {
        const res = await productsApi.getProducts({ limit: 5, search: barcode });
        if (res.items.length > 0) {
          // If we find products, we'll assume the first one is the match (in a real system, barcode should be exact match)
          const matchedProduct = res.items[0];
          addToCart(matchedProduct);
        } else {
          // If not found, just put it in search
          setSearchQuery(barcode);
        }
      } catch (err) {
        console.error('Barcode search failed', err);
      }
    }
  });

  const addToCart = (product: BackendProduct) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, cartQuantity: item.cartQuantity + 1 } : item);
      }
      return [...prev, { ...product, cartQuantity: 1 }];
    });
  };

  const updateCartQuantity = (productId: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        const newQ = item.cartQuantity + delta;
        return newQ > 0 ? { ...item, cartQuantity: newQ } : item;
      }
      return item;
    }));
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsCheckingOut(true);
    try {
      const payload = {
        items: cart.map(item => ({
          productId: item.id,
          quantity: item.cartQuantity,
          price: item.price,
        })),
        // Defaults to POS_CASH on the backend if payments array is missing or empty
      };
      await posApi.checkout(payload);
      setCart([]);
      alert('Order placed successfully! Receipt printing...'); // TODO: actual toast & print
    } catch (error) {
      console.error('Checkout failed', error);
      alert('Checkout failed. See console.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const totalAmount = cart.reduce((acc, item) => acc + (item.price * item.cartQuantity), 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left side: Products Grid & Search */}
      <div className="col-span-2 space-y-4">
        <div className="bg-card text-card-foreground p-4 rounded-lg shadow-sm border border-border">
          <input
            type="text"
            placeholder="Search products or scan barcode..."
            className="w-full p-3 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key === 'Enter' && searchQuery.trim().length > 0) {
                e.preventDefault();
                // Prevent duplicate add if useBarcodeScanner also fired, though useBarcodeScanner calls preventDefault
                try {
                  const res = await productsApi.getProducts({ limit: 5, search: searchQuery.trim() });
                  if (res.items.length === 1 || (res.items.length > 0 && res.items[0].barcode === searchQuery.trim())) {
                    addToCart(res.items[0]);
                    setSearchQuery('');
                  }
                } catch (err) {
                  console.error('Enter search failed', err);
                }
              }
            }}
          />
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {loading ? (
            <div className="col-span-full flex justify-center py-10">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : products.length === 0 ? (
            <div className="col-span-full text-center py-10 text-muted-foreground">
              No products found.
            </div>
          ) : (
            products.map(product => (
              <div 
                key={product.id} 
                onClick={() => addToCart(product)}
                className="bg-card p-3 rounded-lg shadow-sm border border-border cursor-pointer hover:border-primary hover:shadow-md transition-all flex flex-col items-center text-center group"
              >
                <div className="w-full aspect-square bg-secondary/50 rounded-md mb-3 flex items-center justify-center overflow-hidden">
                  <img src={getImageUrl(product.images?.[0])} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                </div>
                <h3 className="font-medium text-sm line-clamp-2 mb-1">{product.name}</h3>
                <p className="font-bold text-primary mt-auto">{product.price.toLocaleString()} {product.currency}</p>
                <p className="text-xs text-muted-foreground mt-1">Stock: {product.quantity}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right side: Cart & Checkout */}
      <div className="bg-card text-card-foreground border border-border rounded-lg shadow-sm h-[calc(100vh-8rem)] flex flex-col">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Current Order</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <span>Cart is empty</span>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-background border border-border rounded-lg">
                  <div className="flex-1 min-w-0 pr-3">
                    <h4 className="font-medium text-sm truncate">{item.name}</h4>
                    <p className="text-primary font-semibold text-sm">{(item.price * item.cartQuantity).toLocaleString()} {item.currency}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateCartQuantity(item.id, -1)} className="p-1 hover:bg-secondary rounded">
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-6 text-center font-medium">{item.cartQuantity}</span>
                    <button onClick={() => updateCartQuantity(item.id, 1)} className="p-1 hover:bg-secondary rounded">
                      <Plus className="w-4 h-4" />
                    </button>
                    <button onClick={() => removeFromCart(item.id)} className="p-1 hover:bg-destructive/10 text-destructive rounded ml-2">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border bg-secondary/30">
          <div className="flex justify-between mb-4">
            <span className="font-semibold text-lg text-foreground">Total</span>
            <span className="font-bold text-xl text-primary">{totalAmount.toLocaleString()} UZS</span>
          </div>
          <button 
            disabled={cart.length === 0 || isCheckingOut}
            onClick={handleCheckout}
            className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground font-bold py-4 rounded-lg text-lg transition-colors flex items-center justify-center gap-2"
          >
            {isCheckingOut ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Pay'}
          </button>
        </div>
      </div>
    </div>
  );
}
