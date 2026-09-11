"use client";

import { useMemo, useState } from "react";
import { ClipboardList, Printer, Search } from "lucide-react";
import { money, today } from "../lib/constants";
import { buildReceipt, getDateRange, isDateInRange, printReceipt } from "../lib/business";
import { DateFilterControl, EmptyState, Metric, Table } from "./ui";

export function SalesHistoryPanel({ sales, items, receiptSettings }) {
  const [filter, setFilter] = useState({ mode: "today", start: today, end: today });
  const [search, setSearch] = useState("");
  const range = useMemo(() => getDateRange(filter), [filter]);
  const itemNames = Object.fromEntries(items.map((item) => [item.Item_ID, item.Item_Name]));
  const filteredSales = sales.filter((sale) => {
    const text = `${sale.Receipt_No || sale.Sale_ID} ${sale.Sale_ID} ${itemNames[sale.Item_ID] || sale.Item_ID}`.toLowerCase();
    return isDateInRange(sale.Date, range) && text.includes(search.toLowerCase());
  });
  const receiptGroups = Object.values(
    filteredSales.reduce((groups, sale) => {
      const receipt = sale.Receipt_No || sale.Sale_ID;
      if (!groups[receipt]) {
        groups[receipt] = {
          receipt,
          date: sale.Date,
          salesRep: sale.Sales_Rep_Name || "",
          items: 0,
          quantity: 0,
          total: 0,
        };
      }
      groups[receipt].items += 1;
      groups[receipt].quantity += Number(sale.Qty_Sold || 0);
      groups[receipt].total += Number(sale.Total_Revenue || 0);
      return groups;
    }, {})
  ).sort((first, second) => String(second.date).localeCompare(String(first.date)));
  const totalRevenue = filteredSales.reduce((sum, sale) => sum + Number(sale.Total_Revenue || 0), 0);
  const totalQty = filteredSales.reduce((sum, sale) => sum + Number(sale.Qty_Sold || 0), 0);

  return (
    <div className="sales-history-grid">
      <DateFilterControl filter={filter} range={range} onChange={setFilter} />
      <section className="metric">
        <span>Revenue</span>
        <strong>{money.format(totalRevenue)}</strong>
      </section>
      <section className="metric">
        <span>Receipts</span>
        <strong>{receiptGroups.length}</strong>
      </section>
      <section className="metric">
        <span>Items Sold</span>
        <strong>{totalQty}</strong>
      </section>
      <section className="panel sales-history-panel">
        <div className="panel-heading">
          <div>
            <h2>Sales History</h2>
            <span>{filteredSales.length} sale records</span>
          </div>
          <ClipboardList size={18} />
        </div>
        <div className="history-search">
          <Search size={17} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search receipt or item" />
        </div>
        {receiptGroups.length ? (
          <div className="receipt-list">
            {receiptGroups.map((group) => (
              <article className="receipt-card" key={group.receipt}>
                <div>
                  <strong>{group.receipt}</strong>
                  <span>{group.date}{group.salesRep ? ` - ${group.salesRep}` : ""}</span>
                </div>
                <span>{group.items} lines</span>
                <span>{group.quantity} qty</span>
                <strong>{money.format(group.total)}</strong>
                <button className="secondary-button compact-button" type="button" onClick={() => printReceipt(buildReceipt(group.receipt, sales, items, group.salesRep, receiptSettings))}>
                  <Printer size={15} />
                  <span>Reprint</span>
                </button>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="No sales found" message="Try another date range or search text." />
        )}
      </section>
      <section className="panel sales-detail-panel">
        <div className="panel-heading">
          <h2>Sale Details</h2>
          <span>{money.format(totalRevenue)}</span>
        </div>
        <Table
          columns={["Date", "Receipt", "Rep", "Item", "Qty", "Unit", "Total"]}
          rows={filteredSales
            .slice()
            .reverse()
            .map((sale) => [
              sale.Date,
              sale.Receipt_No || sale.Sale_ID,
              sale.Sales_Rep_Name || "-",
              itemNames[sale.Item_ID] || sale.Item_ID,
              sale.Qty_Sold,
              money.format(Number(sale.Unit_Selling_Price || 0)),
              money.format(Number(sale.Total_Revenue || 0)),
            ])}
        />
      </section>
    </div>
  );
}

