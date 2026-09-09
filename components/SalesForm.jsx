"use client";

import { useState } from "react";
import { ShoppingCart, Trash2 } from "lucide-react";
import { money, today } from "../lib/constants";
import { EmptyState, Field, FormPanel, Select, useForm } from "./ui";
import { ReceiptPanel } from "./ReceiptPanel";

export function SalesForm({ items, cart, receipt, onSubmit, onCartQty, onRemoveCartItem, onCheckout, onClearCart, onClearReceipt }) {
  const [form, setForm] = useForm({ Date: today, Item_ID: "", Qty_Sold: 1 });
  const [cartDate, setCartDate] = useState(today);
  const selected = items.find((item) => item.Item_ID === form.Item_ID);
  const itemMap = Object.fromEntries(items.map((item) => [item.Item_ID, item]));
  const cartRows = cart
    .map((entry) => ({ ...entry, item: itemMap[entry.Item_ID] }))
    .filter((entry) => entry.item);
  const cartTotal = cartRows.reduce((sum, entry) => sum + Number(entry.Qty_Sold || 0) * Number(entry.item.Selling_Price || 0), 0);

  return (
    <div className="split sales-layout">
      <FormPanel
        title="Record Single Sale"
        button="Save Sale"
        onSubmit={() => onSubmit(form, () => setForm({ Date: today, Item_ID: "", Qty_Sold: 1 }))}
      >
        <Field label="Date" type="date" value={form.Date} onChange={(Date) => setForm({ Date })} />
        <Select label="Item" value={form.Item_ID} onChange={(Item_ID) => setForm({ Item_ID })} options={items} />
        <Field label="Quantity Sold" type="number" value={form.Qty_Sold} onChange={(Qty_Sold) => setForm({ Qty_Sold })} />
        <div className="calculation">
          <span>Expected total</span>
          <strong>{money.format(Number(form.Qty_Sold || 0) * Number(selected?.Selling_Price || 0))}</strong>
        </div>
      </FormPanel>

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
                  <input
                    aria-label={`Quantity for ${entry.item.Item_Name}`}
                    min="1"
                    max={Number(entry.item.Current_Stock || 1)}
                    type="number"
                    value={entry.Qty_Sold}
                    onChange={(event) => onCartQty(entry.Item_ID, event.target.value)}
                  />
                  <strong>{money.format(Number(entry.Qty_Sold || 0) * Number(entry.item.Selling_Price || 0))}</strong>
                  <button className="icon-button" type="button" onClick={() => onRemoveCartItem(entry.Item_ID)} title="Remove from cart">
                    <Trash2 size={16} />
                  </button>
                </article>
              ))}
            </div>
            <div className="cart-total">
              <span>Total</span>
              <strong>{money.format(cartTotal)}</strong>
            </div>
            <div className="cart-actions">
              <button className="primary-button" type="button" onClick={() => onCheckout(cartDate)}>
                <ShoppingCart size={18} />
                <span>Save Basket Sale</span>
              </button>
              <button className="secondary-button" type="button" onClick={onClearCart}>
                <span>Clear</span>
              </button>
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

