"use client";

import { ArrowLeft, ArrowRight, Bell, Cloud, CloudOff, RefreshCw, Search } from "lucide-react";

export function HeaderBar({
  query,
  canGoBack = false,
  canGoForward = false,
  onGoBack,
  onGoForward,
  title = "WONSPAREPARTS Manager",
  lowStockCount = 0,
  outOfStockCount = 0,
  isOnline = true,
  pendingSyncCount = 0,
  onLowStockClick,
  onQueryChange,
  onSyncNow,
}) {
  return (
    <header className="topbar">
      <div className="topbar-title">
        <div className="page-navigation" role="group" aria-label="Page navigation">
          <button type="button" className="icon-button" aria-label="Go back" title="Back" disabled={!canGoBack} onClick={onGoBack}>
            <ArrowLeft size={19} />
          </button>
          <button type="button" className="icon-button" aria-label="Go forward" title="Forward" disabled={!canGoForward} onClick={onGoForward}>
            <ArrowRight size={19} />
          </button>
        </div>
        <div>
          <p className="eyebrow">Sales & Inventory</p>
          <h1>{title}</h1>
        </div>
      </div>
      <div className="topbar-actions">
        <button
          className={isOnline && pendingSyncCount === 0 ? "sync-status-button" : "sync-status-button attention"}
          type="button"
          onClick={onSyncNow}
          title={isOnline ? `${pendingSyncCount} record${pendingSyncCount === 1 ? "" : "s"} pending sync` : "Offline mode"}
        >
          {isOnline ? <Cloud size={18} /> : <CloudOff size={18} />}
          <span>{isOnline ? "Online" : "Offline"}</span>
          {pendingSyncCount > 0 && <strong>{pendingSyncCount}</strong>}
          {pendingSyncCount > 0 && isOnline && <RefreshCw size={14} />}
        </button>
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
