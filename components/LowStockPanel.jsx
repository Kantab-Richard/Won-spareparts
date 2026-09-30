"use client";

import { Download, Plus, TriangleAlert } from "lucide-react";
import { money } from "../lib/constants";
import { EmptyState, StockBadge } from "./ui";

export function LowStockPanel({ items, categoryNames, lowStockLimit, onAddToCart }) {
  const outOfStockCount = items.filter((item) => Number(item.Current_Stock || 0) <= 0).length;

  function downloadRestockList() {
    const headers = ["Item ID", "Item Name", "Category", "Current Stock", "Low Stock Limit", "Suggested Restock"];
    const rows = items.map((item) => {
      const currentStock = Number(item.Current_Stock || 0);
      return [
        item.Item_ID,
        item.Item_Name,
        categoryNames[item.Category_ID] || item.Category_ID,
        currentStock,
        lowStockLimit,
        Math.max(lowStockLimit * 2 - currentStock, lowStockLimit),
      ];
    });
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "WONSPAREPARTS-low-stock-restock-list.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="panel low-stock-page">
      <div className="panel-heading">
        <div>
          <h2>Low Stock Items</h2>
          <span>{items.length} low-stock items · {outOfStockCount} out of stock</span>
        </div>
        <div className="low-stock-actions">
          {items.length > 0 && (
            <button className="secondary-button compact-button" type="button" onClick={downloadRestockList}>
              <Download size={16} />
              <span>Restock List</span>
            </button>
          )}
          <TriangleAlert size={18} />
        </div>
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
              <span className={Number(item.Current_Stock || 0) <= 0 ? "severity-badge danger" : "severity-badge warning"}>
                {Number(item.Current_Stock || 0) <= 0 ? "Out" : "Low"}
              </span>
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
