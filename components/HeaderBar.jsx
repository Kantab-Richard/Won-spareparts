"use client";

import { Bell, Search } from "lucide-react";

export function HeaderBar({ query, title = "WONSPAREPARTS Manager", lowStockCount = 0, outOfStockCount = 0, onLowStockClick, onQueryChange }) {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">Sales & Inventory</p>
        <h1>{title}</h1>
      </div>
      <div className="topbar-actions">
        {onLowStockClick && (
          <button
            className={lowStockCount ? "notification-button alert" : "notification-button"}
            type="button"
            onClick={onLowStockClick}
            title={lowStockCount ? `${lowStockCount} low-stock item${lowStockCount === 1 ? "" : "s"}` : "No low-stock items"}
          >
            <Bell size={19} />
            {lowStockCount > 0 && <span>{lowStockCount}</span>}
            {outOfStockCount > 0 && <strong>{outOfStockCount} out</strong>}
          </button>
        )}
        <div className="search">
          <Search size={18} />
          <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search items" />
        </div>
      </div>
    </header>
  );
}
