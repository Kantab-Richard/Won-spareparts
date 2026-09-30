"use client";

import { ArrowRight, Boxes, ClipboardList, PackagePlus, Plus, ReceiptText, TriangleAlert } from "lucide-react";
import { money, today } from "../lib/constants";
import { DateFilterControl, EmptyState, Metric, StatusBadge, StockBadge, Table } from "./ui";

export function Dashboard({ view, items, data, role, dateFilter, dateRange, lowStockLimit = 10, onDateFilterChange, onNavigate }) {
  const isManager = role === "manager";
  const lowStockItems = items.filter((item) => Number(item.Current_Stock || 0) <= lowStockLimit);
  const activeItems = items.filter((item) => (item.Status || "Active") === "Active");
  const itemsSold = view.sales.reduce((sum, sale) => sum + Number(sale.Qty_Sold || 0), 0);
  const topSellingItems = Object.values(
    view.sales.reduce((grouped, sale) => {
      const itemId = sale.Item_ID || "Unknown";
      const current = grouped[itemId] || {
        itemId,
        name: view.itemNames[itemId] || itemId,
        qty: 0,
        revenue: 0,
      };
      current.qty += Number(sale.Qty_Sold || 0);
      current.revenue += Number(sale.Total_Revenue || 0);
      grouped[itemId] = current;
      return grouped;
    }, {})
  )
    .sort((first, second) => second.qty - first.qty || second.revenue - first.revenue)
    .slice(0, 5);
  const quickActions = isManager
    ? [
        { label: "New Sale", detail: "Open cart sale", icon: ReceiptText, tab: "sales", tone: "orange" },
        { label: "Add Stock", detail: "Record stock in", icon: PackagePlus, tab: "stock" },
        { label: "Create Item", detail: "Add spare part", icon: Plus, tab: "items" },
        { label: "Reports", detail: "View history", icon: ClipboardList, tab: "reports" },
      ]
    : [
        { label: "New Sale", detail: "Open cart sale", icon: ReceiptText, tab: "sales", tone: "orange" },
        { label: "Items", detail: "Search inventory", icon: Boxes, tab: "items" },
      ];
  const hasInventory = items.length > 0;
  const hasSales = view.sales.length > 0;

  return (
    <div className="content-grid">
      {isManager && (
        <DateFilterControl filter={dateFilter} range={dateRange} onChange={onDateFilterChange} />
      )}
      <section className="panel dashboard-summary-panel">
        <div>
          <span className="eyebrow">{isManager ? "Business Summary" : "Sales Workspace"}</span>
          <h2>{isManager ? "Today's shop position" : "Ready for sales"}</h2>
          <p>
            {isManager
              ? `${view.sales.length} sales records, ${itemsSold} items sold, and ${lowStockItems.length} low-stock items in this report date.`
              : `${activeItems.length} active items available. Use Sales to add items to the basket and print receipts.`}
          </p>
        </div>
        <div className="dashboard-summary-actions">
          {quickActions.slice(0, 2).map((action) => {
            const Icon = action.icon;
            return (
              <button
                className={action.tone === "orange" ? "quick-action-button primary" : "quick-action-button"}
                type="button"
                key={action.label}
                onClick={() => onNavigate(action.tab)}
              >
                <Icon size={18} />
                <span>{action.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      <Metric title={isManager ? "Revenue" : "Items Available"} value={isManager ? money.format(view.revenue) : activeItems.length} />
      <Metric title={isManager ? "Gross Profit" : "Stock Units"} value={isManager ? money.format(view.grossProfit) : activeItems.reduce((sum, item) => sum + Number(item.Current_Stock || 0), 0)} />
      <Metric title={isManager ? "Net Profit" : "Sales Today"} value={isManager ? money.format(view.netProfit) : data.sales.filter((sale) => sale.Date === today).length} />
      <Metric title={isManager ? "Stock Value" : "Recent Sales"} value={isManager ? money.format(view.stockValue) : data.sales.length} />

      {isManager && (
        <Metric title="Expenses" value={money.format(view.expenses)} />
      )}
      {isManager && (
        <Metric title="Items Sold" value={itemsSold} />
      )}

      <section className="panel dashboard-quick-panel">
        <div className="panel-heading">
          <h2>Quick Actions</h2>
          <span>Fast work</span>
        </div>
        <div className="dashboard-quick-grid">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                className={action.tone === "orange" ? "dashboard-action-card primary" : "dashboard-action-card"}
                type="button"
                key={action.label}
                onClick={() => onNavigate(action.tab)}
              >
                <Icon size={20} />
                <span>
                  <strong>{action.label}</strong>
                  <small>{action.detail}</small>
                </span>
                <ArrowRight size={16} />
              </button>
            );
          })}
        </div>
      </section>

      {isManager && (
        <section className="panel top-sellers-panel">
          <div className="panel-heading">
            <h2>Top Selling Items</h2>
            <span>{topSellingItems.length} items</span>
          </div>
          {topSellingItems.length ? (
            <div className="top-seller-list">
              {topSellingItems.map((item, index) => (
                <div className="top-seller-row" key={item.itemId}>
                  <span className="top-seller-rank">{index + 1}</span>
                  <div>
                    <strong>{item.name}</strong>
                    <span>{item.qty} sold</span>
                  </div>
                  <b>{money.format(item.revenue)}</b>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No top sellers yet"
              message="Items will appear here after sales are recorded for this report date."
              actionLabel="New Sale"
              onAction={() => onNavigate("sales")}
            />
          )}
        </section>
      )}

      <section className="panel wide">
        <div className="panel-heading">
          <h2>Inventory</h2>
          <span>{items.length} items</span>
        </div>
        {hasInventory ? (
          <Table
            columns={["Item", "Category", "Cost", "Selling", "Stock"]}
            rows={items.map((item) => [
              item.Item_Name,
                view.categoryNames[item.Category_ID] || item.Category_ID,
                money.format(Number(item.Cost_Price || 0)),
                money.format(Number(item.Selling_Price || 0)),
                <>
                  <StockBadge key={`${item.Item_ID}-stock`} value={Number(item.Current_Stock || 0)} limit={lowStockLimit} />
                  {isManager && <StatusBadge status={item.Status || "Active"} />}
                </>,
            ])}
          />
        ) : (
          <EmptyState
            title="No inventory yet"
            message="Add your spare parts first so sales and stock levels can be tracked."
            actionLabel="Add Item"
            onAction={() => onNavigate("items")}
          />
        )}
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>Recent Sales</h2>
          <ClipboardList size={18} />
        </div>
        {hasSales ? (
          <Table
            columns={["Date", "Item", "Qty", "Total"]}
            rows={view.sales
              .slice(-6)
              .reverse()
              .map((sale) => [
                sale.Date,
                view.itemNames[sale.Item_ID] || sale.Item_ID,
                sale.Qty_Sold,
                money.format(Number(sale.Total_Revenue || 0)),
              ])}
          />
        ) : (
          <EmptyState
            title="No sales recorded"
            message="Record a sale when a customer buys an item."
            actionLabel="Record Sale"
            onAction={() => onNavigate("sales")}
          />
        )}
      </section>

      {isManager && (
        <section className="panel low-stock-panel">
          <div className="panel-heading">
            <h2>Low Stock</h2>
            <button className="icon-link-button" type="button" onClick={() => onNavigate("lowStock")} aria-label="Open low stock items">
              <TriangleAlert size={18} />
            </button>
          </div>
          {lowStockItems.length ? (
            <div className="low-stock-list">
              {lowStockItems.slice(0, 6).map((item) => (
                <div className="low-stock-row" key={item.Item_ID}>
                  <div>
                    <strong>{item.Item_Name}</strong>
                    <span>{view.categoryNames[item.Category_ID] || item.Category_ID}</span>
                  </div>
                  <StockBadge value={Number(item.Current_Stock || 0)} limit={lowStockLimit} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Stock levels look good" message={`Items with ${lowStockLimit} or fewer pieces will appear here.`} />
          )}
        </section>
      )}
    </div>
  );
}

