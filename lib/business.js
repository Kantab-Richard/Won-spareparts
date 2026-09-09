"use client";

import { money, today } from "./constants";

export function buildLoginUsers(localUsers, salesReps) {
  const managerUsers = localUsers.filter((user) => user.role === "manager");
  const sheetUsers = salesReps
    .filter((rep) => (rep.Status || "Active") === "Active")
    .map(salesRepToUser);
  return mergeUsers(managerUsers, sheetUsers);
}

export function salesRepToUser(rep) {
  return {
    role: "sales",
    repId: rep.Rep_ID || rep.repId || "",
    name: rep.Rep_Name || rep.name || "Sales Representative",
    username: rep.Username || rep.username || "",
    password: rep.Password || rep.password || "",
  };
}

export function mergeUsers(...groups) {
  const merged = [];
  groups.flat().forEach((user) => {
    if (!user?.username) return;
    const key = user.username.toLowerCase();
    const existingIndex = merged.findIndex((entry) => entry.username.toLowerCase() === key);
    if (existingIndex >= 0) {
      merged[existingIndex] = user;
    } else {
      merged.push(user);
    }
  });
  return merged;
}

export function buildReceipt(receiptNo, sales, items, fallbackRep) {
  const itemMap = Object.fromEntries(items.map((item) => [item.Item_ID, item]));
  const rows = sales.filter((sale) => (sale.Receipt_No || sale.Sale_ID) === receiptNo);
  const first = rows[0] || {};
  return {
    receiptNo: receiptNo || first.Receipt_No || first.Sale_ID || "Receipt",
    date: first.Date || today,
    salesRep: first.Sales_Rep_Name || fallbackRep || "",
    items: rows.map((sale) => ({
      itemId: sale.Item_ID,
      name: itemMap[sale.Item_ID]?.Item_Name || sale.Item_ID,
      qty: Number(sale.Qty_Sold || 0),
      unitPrice: Number(sale.Unit_Selling_Price || 0),
      total: Number(sale.Total_Revenue || 0),
    })),
    total: rows.reduce((sum, sale) => sum + Number(sale.Total_Revenue || 0), 0),
  };
}

export function printReceipt(receipt) {
  const html = `
    <html>
      <head>
        <title>${receipt.receiptNo}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 18px; color: #111827; }
          .paper { max-width: 320px; margin: 0 auto; }
          h1 { font-size: 22px; margin: 0; text-align: center; font-weight: 800; }
          p { margin: 4px 0; text-align: center; }
          .welcome, .thanks { margin: 14px 0; font-weight: 700; }
          .meta { border-top: 1px solid #d1d5db; border-bottom: 1px solid #d1d5db; padding: 8px 0; margin: 10px 0; font-size: 12px; }
          .meta span, .line { display: flex; justify-content: space-between; gap: 8px; margin: 5px 0; }
          .line span:first-child { flex: 1; }
          .total { display: flex; justify-content: space-between; border-top: 2px solid #111827; margin-top: 10px; padding-top: 8px; font-size: 16px; font-weight: 800; }
        </style>
      </head>
      <body>
        <div class="paper">
          <h1>WONSPAREPARTS</h1>
          <p>Premium Auto & Industrial Parts</p>
          <p class="welcome">Welcome to WONSPAREPARTS</p>
          <div class="meta">
            <span><b>Receipt No:</b> ${receipt.receiptNo}</span>
            <span><b>Date:</b> ${receipt.date}</span>
            <span><b>Sales Rep:</b> ${receipt.salesRep || "Sales Representative"}</span>
          </div>
          ${receipt.items
            .map(
              (item) => `<div class="line"><span>${item.name}</span><span>${item.qty} x ${money.format(item.unitPrice)}</span><b>${money.format(item.total)}</b></div>`
            )
            .join("")}
          <div class="total"><span>Total</span><span>${money.format(receipt.total)}</span></div>
          <p class="thanks">Thank you for buying from WONSPAREPARTS. Please come again.</p>
        </div>
        <script>window.print(); window.onafterprint = () => window.close();</script>
      </body>
    </html>`;
  const printWindow = window.open("", "_blank", "width=420,height=640");
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
}

export function guessItemId(name, items) {
  const scanName = normalizeName(name);
  if (!scanName) return "";
  const exact = items.find((item) => normalizeName(item.Item_Name) === scanName);
  if (exact) return exact.Item_ID;
  const partial = items.find((item) => {
    const itemName = normalizeName(item.Item_Name);
    return itemName.includes(scanName) || scanName.includes(itemName);
  });
  return partial?.Item_ID || "";
}

export function guessCategoryId(name, categories) {
  const scanName = normalizeName(name);
  if (!scanName) return "";
  const exact = categories.find((category) => normalizeName(category.Category_Name) === scanName);
  if (exact) return exact.Category_ID;
  const partial = categories.find((category) => {
    const categoryName = normalizeName(category.Category_Name);
    return categoryName.includes(scanName) || scanName.includes(categoryName);
  });
  return partial?.Category_ID || "";
}

export function normalizeName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function buildViewModel(data, dateRange) {
  const itemNames = Object.fromEntries(data.items.map((item) => [item.Item_ID, item.Item_Name]));
  const categoryNames = Object.fromEntries(data.categories.map((category) => [category.Category_ID, category.Category_Name]));
  const sales = data.sales.filter((sale) => isDateInRange(sale.Date, dateRange));
  const rangeExpenses = data.expenses.filter((expense) => isDateInRange(expense.Date, dateRange));
  const revenue = sales.reduce((sum, sale) => sum + Number(sale.Total_Revenue || 0), 0);
  const cogs = sales.reduce((sum, sale) => sum + Number(sale.Total_COGS || 0), 0);
  const expenses = rangeExpenses.reduce((sum, expense) => sum + Number(expense.Amount || 0), 0);
  const stockValue = data.items.reduce((sum, item) => sum + Number(item.Cost_Price || 0) * Number(item.Current_Stock || 0), 0);
  return {
    itemNames,
    categoryNames,
    sales,
    expenseRows: rangeExpenses,
    revenue,
    cogs,
    expenses,
    grossProfit: revenue - cogs,
    netProfit: revenue - cogs - expenses,
    stockValue,
  };
}

export function getDateRange(filter) {
  if (filter.mode === "custom") {
    const start = filter.start || today;
    const end = filter.end || start;
    return start <= end ? { start, end } : { start: end, end: start };
  }

  const current = new Date(`${today}T00:00:00`);
  if (filter.mode === "week") {
    const day = current.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const start = addDays(current, mondayOffset);
    return { start: toDateInput(start), end: today };
  }

  if (filter.mode === "month") {
    return { start: `${today.slice(0, 7)}-01`, end: today };
  }

  return { start: today, end: today };
}

export function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function toDateInput(date) {
  return date.toISOString().slice(0, 10);
}

export function isDateInRange(date, range) {
  return date >= range.start && date <= range.end;
}

export function formatDateRange(range) {
  return range.start === range.end ? range.start : `${range.start} to ${range.end}`;
}

