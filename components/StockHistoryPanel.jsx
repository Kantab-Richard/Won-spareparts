"use client";

import { History } from "lucide-react";
import { Table } from "./ui";

export function StockHistoryPanel({ movements, items }) {
  const itemNames = Object.fromEntries(items.map((item) => [item.Item_ID, item.Item_Name]));
  const rows = [...movements]
    .slice(-60)
    .reverse()
    .map((movement) => [
      movement.Date,
      itemNames[movement.Item_ID] || movement.Item_ID,
      movement.Type,
      Number(movement.Qty_Change || 0),
      Number(movement.Balance_After || 0),
      movement.Reference || "-",
    ]);

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Stock Movement History</h2>
          <span>{movements.length} movements</span>
        </div>
        <History size={18} />
      </div>
      <Table columns={["Date", "Item", "Type", "Change", "Balance", "Ref"]} rows={rows} />
    </section>
  );
}

