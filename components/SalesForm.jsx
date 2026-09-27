"use client";

import { useState } from "react";
import { Minus, Plus, Search, ShoppingCart, Trash2 } from "lucide-react";
import { money, today } from "../lib/constants";
import { EmptyState, Field } from "./ui";
import { ReceiptPanel } from "./ReceiptPanel";

export function SalesForm({ items, cart, receipt, onAddToCart, onCartQty, onRemoveCartItem, onCheckout, onClearCart, onClearReceipt }) {
  const [cartDate, setCartDate] = useState(today);
  const [itemSearch, setItemSearch] = useState("");
  const itemMap = Object.fromEntries(items.map((item) => [item.Item_ID, item]));
  const cartRows = cart
    .map((entry) => ({ ...entry, item: itemMap[entry.Item_ID] }))
    .filter((entry) => entry.item);
  const cartTotal = cartRows.reduce((sum, entry) => sum + Number(entry.Qty_Sold || 0) * Number(entry.item.Selling_Price || 0), 0);
  const searchText = itemSearch.trim().toLowerCase();
  const saleItems = items
    .filter((item) => Number(item.Current_Stock || 0) > 0)
    .filter((item) => !searchText || `${item.Item_Name} ${item.Item_ID}`.toLowerCase().includes(searchText))
    .slice(0, 8);

  function clearCartWithConfirm() {
    if (!cartRows.length) return;
    if (window.confirm("Clear all items from this sale cart?")) {
      onClearCart();
    }
  }

  return (
    <div className="sales-layout">
      <section className="panel sale-item-picker">
        <div className="panel-heading">
          <div>
            <h2>Add Items</h2>
            <span>Search by item name or code, then add to the sale cart.</span>
          </div>
          <Search size={18} />
        </div>
        <label className="history-search sale-search">
          <Search size={17} />
          <input value={itemSearch} onChange={(event) => setItemSearch(event.target.value)} placeholder="Search items for sale" />
        </label>
        {saleItems.length ? (
          <div className="sale-item-list">
            {saleItems.map((item) => (
              <article className="sale-item-row" key={item.Item_ID}>
                <div>
                  <strong>{item.Item_Name}</strong>
                  <span>{item.Item_ID} · Stock {Number(item.Current_Stock || 0)}</span>
                </div>
                <strong>{money.format(Number(item.Selling_Price || 0))}</strong>
                <button className="primary-button compact-button" type="button" onClick={() => onAddToCart(item)}>
                  <Plus size={16} />
                  <span>Add</span>
                </button>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="No sellable items found" message="Try another search or add stock to this item first." />
        )}
      </section>

      <section className="panel sale-cart-panel">
        <div className="panel-heading">
          <div>
            <h2>Sale Cart</h2>
            <span>{cartRows.length} items in basket</span>
          </div>
          <ShoppingCart size={18} />
        </div>
        <Field label="Sale Date" type="date" value={cartDate} onChange={setCartDate} />
        {cartRows.length ? (
          <>
            <div className="cart-list">
              {cartRows.map((entry) => (
                <article className="cart-row" key={entry.Item_ID}>
                  <div>
                    <strong>{entry.item.Item_Name}</strong>
                    <span>{money.format(Number(entry.item.Selling_Price || 0))} each</span>
                  </div>
                  <div className="cart-qty-control">
                    <button
                      className="icon-button"
                      type="button"
                      onClick={() => onCartQty(entry.Item_ID, Number(entry.Qty_Sold || 1) - 1)}
                      title="Reduce quantity"
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      aria-label={`Quantity for ${entry.item.Item_Name}`}
                      min="1"
                      max={Number(entry.item.Current_Stock || 1)}
                      type="number"
                      value={entry.Qty_Sold}
                      onChange={(event) => onCartQty(entry.Item_ID, event.target.value)}
                    />
                    <button
                      className="icon-button"
                      type="button"
                      onClick={() => onCartQty(entry.Item_ID, Number(entry.Qty_Sold || 1) + 1)}
                      title="Increase quantity"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <strong>{money.format(Number(entry.Qty_Sold || 0) * Number(entry.item.Selling_Price || 0))}</strong>
                  <button className="icon-button" type="button" onClick={() => onRemoveCartItem(entry.Item_ID)} title="Remove from cart">
                    <Trash2 size={16} />
                  </button>
                </article>
              ))}
            </div>
            <div className="cart-checkout-bar">
              <div className="cart-total">
                <span>Total</span>
                <strong>{money.format(cartTotal)}</strong>
              </div>
              <div className="cart-actions">
                <button className="primary-button" type="button" onClick={() => onCheckout(cartDate)}>
                  <ShoppingCart size={18} />
                  <span>Save Basket Sale</span>
                </button>
                <button className="secondary-button" type="button" onClick={clearCartWithConfirm}>
                  <span>Clear</span>
                </button>
              </div>
            </div>
          </>
        ) : (
          <EmptyState title="Cart is empty" message="Use Add to Cart from the item list to build a basket sale." />
        )}
      </section>
      {receipt && (
        <ReceiptPanel receipt={receipt} onClose={onClearReceipt} />
      )}
    </div>
  );
}

