"use client";

import { ClipboardList, PackagePlus, TriangleAlert } from "lucide-react";
import { money, today } from "../lib/constants";
import { DateFilterControl, EmptyState, Metric, StatusBadge, StockBadge, Table } from "./ui";

export function Dashboard({ view, items, data, role, dateFilter, dateRange, onDateFilterChange, onNavigate }) {
  const isManager = role === "manager";
  const lowStockItems = items.filter((item) => Number(item.Current_Stock || 0) <= 10);
  const hasInventory = items.length > 0;
  const hasSales = view.sales.length > 0;

  return (
    <div className="content-grid">
      {isManager && (
        <DateFilterControl filter={dateFilter} range={dateRange} onChange={onDateFilterChange} />
      )}
      <Metric title={isManager ? "Revenue" : "Items Available"} value={isManager ? money.format(view.revenue) : items.length} />
      <Metric title={isManager ? "Gross Profit" : "Stock Units"} value={isManager ? money.format(view.grossProfit) : items.reduce((sum, item) => sum + Number(item.Current_Stock || 0), 0)} />
      <Metric title={isManager ? "Net Profit" : "Sales Today"} value={isManager ? money.format(view.netProfit) : data.sales.filter((sale) => sale.Date === today).length} />
      <Metric title={isManager ? "Stock Value" : "Recent Sales"} value={isManager ? money.format(view.stockValue) : data.sales.length} />

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
                  <StockBadge key={`${item.Item_ID}-stock`} value={Number(item.Current_Stock || 0)} />
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
            <TriangleAlert size={18} />
          </div>
          {lowStockItems.length ? (
            <div className="low-stock-list">
              {lowStockItems.slice(0, 6).map((item) => (
                <div className="low-stock-row" key={item.Item_ID}>
                  <div>
                    <strong>{item.Item_Name}</strong>
                    <span>{view.categoryNames[item.Category_ID] || item.Category_ID}</span>
                  </div>
                  <StockBadge value={Number(item.Current_Stock || 0)} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Stock levels look good" message="Items with 10 or fewer pieces will appear here." />
          )}
        </section>
      )}
    </div>
  );
}

