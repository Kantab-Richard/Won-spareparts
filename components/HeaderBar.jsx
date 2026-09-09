"use client";

import { Search } from "lucide-react";

export function HeaderBar({ query, title = "WONSPAREPARTS Manager", onQueryChange }) {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">Sales & Inventory</p>
        <h1>{title}</h1>
      </div>
      <div className="search">
        <Search size={18} />
        <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search items" />
      </div>
    </header>
  );
}
