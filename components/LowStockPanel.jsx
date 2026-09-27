"use client";

import { Plus, TriangleAlert } from "lucide-react";
import { money } from "../lib/constants";
import { EmptyState, StockBadge } from "./ui";

export function LowStockPanel({ items, categoryNames, lowStockLimit, onAddToCart }) {
  return (
    <section className="panel low-stock-page">
      <div className="panel-heading">
        <div>
          <h2>Low Stock Items</h2>
          <span>{items.length} items at or below {lowStockLimit}</span>
        </div>
        <TriangleAlert size={18} />
      </div>
      {items.length ? (
        <div className="low-stock-page-list">
          {items.map((item) => (
            <article className="low-stock-page-row" key={item.Item_ID}>
              <div>
                <strong>{item.Item_Name}</strong>
                <span>{item.Item_ID} · {categoryNames[item.Category_ID] || item.Category_ID}</span>
              </div>
              <span>{money.format(Number(item.Selling_Price || 0))}</span>
              <StockBadge value={Number(item.Current_Stock || 0)} limit={lowStockLimit} />
              {(item.Status || "Active") === "Active" && Number(item.Current_Stock || 0) > 0 && (
                <button className="primary-button compact-button" type="button" onClick={() => onAddToCart(item)}>
                  <Plus size={16} />
                  <span>Add</span>
                </button>
              )}
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="No low stock items" message="All items are currently above the low-stock limit." />
      )}
    </section>
  );
}
