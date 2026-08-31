'use client';

import { useEffect, useState } from 'react';
import { addToCart, getCart, setQty, removeFromCart, subscribe, type CartItem } from '@/lib/cart';
import type { VendorProduct } from '@/lib/vendor-product';
import { getProductGroup, getProductFormat } from '@/lib/outsyde-products';

type Filter = 'all' | 'morning' | 'midday' | 'night' | 'tea' | 'herbs';

// Map known blend category names to filter keys.
function blendToFilter(group: string): Filter | null {
  const g = group.toLowerCase();
  if (g.includes('rise') || g.includes('morning')) return 'morning';
  if (g.includes('heart') || g.includes('midday')) return 'midday';
  if (g.includes('dream') || g.includes('night')) return 'night';
  return null;
}

interface GroupedProducts {
  group: string;
  filterKey: Filter | null;
  products: VendorProduct[];
}

function groupProducts(products: VendorProduct[]): GroupedProducts[] {
  const map = new Map<string, VendorProduct[]>();
  for (const p of products) {
    const g = getProductGroup(p);
    if (!map.has(g)) map.set(g, []);
    map.get(g)!.push(p);
  }
  return Array.from(map.entries()).map(([group, prods]) => ({
    group,
    filterKey: blendToFilter(group),
    products: prods,
  }));
}

const BADGE: Record<string, { cls: string; label: string }> = {
  morning: { cls: 'badge-morning', label: 'Morning Blend' },
  midday:  { cls: 'badge-midday',  label: 'Midday Blend'  },
  night:   { cls: 'badge-night',   label: 'Night Blend'   },
};

export default function LotusShopClient({ initialProducts }: { initialProducts: VendorProduct[] }) {
  const [active, setActive] = useState<Filter>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setCart(getCart());
    return subscribe(() => setCart(getCart()));
  }, []);

  const count = cart.reduce((n, i) => n + i.qty, 0);
  const subtotal = cart.reduce((s, i) => s + (i.priceCents / 100) * i.qty, 0);

  function addItem(p: VendorProduct) {
    addToCart({
      id: p.id,
      name: p.name,
      priceCents: p.price,
      image: p.imageUrl ?? '',
      vendor: 'Lotus House Blends',
      vendorId: '8523e3c5-fc07-461b-9452-087d2b4aada6',
      isExternalProduct: true,
    });
    setDrawerOpen(true);
  }

  const groups = groupProducts(initialProducts);

  function isGroupVisible(g: GroupedProducts): boolean {
    if (active === 'all' || active === 'tea' || active === 'herbs') return true;
    return g.filterKey === active;
  }

  function isProductVisible(p: VendorProduct): boolean {
    if (active === 'tea' || active === 'herbs') {
      return getProductFormat(p) === active;
    }
    return true;
  }

  return (
    <>
      {/* FILTER TABS */}
      <div className="filter-row">
        {([
          ['all', 'All Blends'],
          ['morning', 'Rise & Bloom — Morning'],
          ['midday', 'Heart Flow — Midday'],
          ['night', 'Dream Temple — Night'],
          ['tea', 'Tea Boxes'],
          ['herbs', 'Loose Herbs'],
        ] as [Filter, string][]).map(([key, label]) => (
          <button
            key={key}
            className={`ftab${active === key ? ' active' : ''}`}
            onClick={() => setActive(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* PRODUCT GROUPS */}
      {groups.length === 0 ? (
        <p style={{ color: 'var(--lhb-text-muted)', fontSize: '.9rem', fontFamily: 'Jost, sans-serif' }}>
          No products available at the moment. Check back soon.
        </p>
      ) : (
        groups
          .filter(isGroupVisible)
          .map((g) => {
            const badge = g.filterKey ? BADGE[g.filterKey] : null;
            const visibleProducts = g.products.filter(isProductVisible);
            if (visibleProducts.length === 0) return null;

            return (
              <div key={g.group} className="blend-group">
                <div className="blend-group-hdr">
                  {badge && <span className={`time-badge ${badge.cls}`}>{badge.label}</span>}
                  <h3 className="blend-group-title">{g.group}</h3>
                </div>
                <div className="product-grid">
                  {visibleProducts.map((p) => {
                    const fmt = getProductFormat(p);
                    const fmtLabel = fmt === 'tea' ? 'Tea Box' : fmt === 'herbs' ? 'Loose Herbs' : '';
                    return (
                      <a key={p.id} href={`/shop/lotus/${p.id}`} className="pcard">
                        <div className="pcard-img">
                          {p.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.imageUrl} alt={p.name} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', background: '#e8e0d0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--lhb-text-muted)', fontSize: '.8rem' }}>
                              No image
                            </div>
                          )}
                          {fmtLabel && <span className="ptype-tag">{fmtLabel}</span>}
                        </div>
                        <div className="pcard-body">
                          <div className="pcard-name">{p.name}</div>
                          <div className="pcard-desc">{p.description ?? ''}</div>
                          <div className="pcard-footer">
                            <div>
                              <span className="pcard-price">${(p.price / 100).toFixed(2)}</span>
                            </div>
                            <button
                              className="pcard-add"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); addItem(p); }}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            );
          })
      )}

      {/* CART DRAWER */}
      <div className={`cart-overlay${drawerOpen ? ' open' : ''}`} onClick={() => setDrawerOpen(false)} />
      <aside className={`cart-drawer${drawerOpen ? ' open' : ''}`} aria-hidden={!drawerOpen}>
        <div className="cart-drawer-hdr">
          <h3>Your Cart</h3>
          <button className="cart-close" onClick={() => setDrawerOpen(false)} aria-label="Close cart">×</button>
        </div>
        <div className="cart-items">
          {cart.length === 0 ? (
            <p className="cart-empty">Your cart is empty.</p>
          ) : (
            <>
              <div className="cart-vendor-label">Lotus House Blends</div>
              {cart.map((i) => (
                <div className="cart-line" key={i.id}>
                  {i.image && <img className="cart-line-img" src={i.image} alt={i.name} />}
                  <div className="cart-line-info">
                    <div className="cart-line-name">{i.name}</div>
                    <div className="cart-line-price">${(i.priceCents / 100).toFixed(2)}</div>
                    <div className="cart-qty">
                      <button onClick={() => setQty(i.id, i.qty - 1)} aria-label="Decrease">−</button>
                      <span>{i.qty}</span>
                      <button onClick={() => setQty(i.id, i.qty + 1)} aria-label="Increase">+</button>
                      <button className="cart-remove" onClick={() => removeFromCart(i.id)}>Remove</button>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
        {cart.length > 0 && (
          <div className="cart-foot">
            <div className="cart-subtotal">
              <span>Subtotal</span>
              <strong>${subtotal.toFixed(2)}</strong>
            </div>
            <a href="/checkout" className="cart-checkout">Checkout</a>
            <a href="/cart" className="cart-viewcart">View full cart</a>
          </div>
        )}
      </aside>

      {/* Cart button (floating, top-right) */}
      <div style={{ position: 'fixed', top: 16, right: 24, zIndex: 101 }}>
        <button className="cart-btn" onClick={() => setDrawerOpen(true)} aria-label="Open cart">
          Cart{count > 0 && <span className="cart-count">{count}</span>}
        </button>
      </div>
    </>
  );
}
