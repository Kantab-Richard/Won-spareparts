"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { addBasketSale, addCategory, addExpense, addItem, addSale, addSalesRep, addStock, addSupplier, analyzeSupplyScan, checkConnection, fetchDatabase, updateCategory, updateItem, updateSalesRep, updateSupplier } from "../lib/api";
import { HeaderBar } from "../components/HeaderBar";
import { Sidebar } from "../components/Sidebar";
import { Dashboard } from "../components/Dashboard";
import { LoginScreen } from "../components/LoginScreen";
import { SalesForm } from "../components/SalesForm";
import { AiSupplyScanPanel } from "../components/AiSupplyScanPanel";
import { StockForm } from "../components/StockForm";
import { SuppliersPanel } from "../components/SuppliersPanel";
import { StockHistoryPanel } from "../components/StockHistoryPanel";
import { SalesHistoryPanel } from "../components/SalesHistoryPanel";
import { ItemsPanel } from "../components/ItemsPanel";
import { ExpensesPanel } from "../components/ExpensesPanel";
import { CategoriesPanel } from "../components/CategoriesPanel";
import { SettingsPanel } from "../components/SettingsPanel";
import { buildLoginUsers, buildReceipt, buildViewModel, getDateRange, normalizeName } from "../lib/business";
import { defaultUsers, emptyData, roleTabs, today } from "../lib/constants";

export default function Home() {
  const [session, setSession] = useState(null);
  const [users, setUsers] = useState(defaultUsers);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [data, setData] = useState(emptyData);
  const [status, setStatus] = useState("Loading your shop records...");
  const [query, setQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState({ mode: "today", start: today, end: today });
  const [saleCart, setSaleCart] = useState([]);
  const [lastReceipt, setLastReceipt] = useState(null);

  useEffect(() => {
    const stored = window.localStorage.getItem("wonspareparts-session");
    if (stored) {
      setSession(JSON.parse(stored));
    }
    const storedUsers = window.localStorage.getItem("wonspareparts-users");
    if (storedUsers) {
      setUsers(JSON.parse(storedUsers));
    }
  }, []);

  const visibleTabs = useMemo(() => roleTabs[session?.role] || [], [session?.role]);

  const loadData = useCallback(async () => {
    setStatus("Refreshing records...");
    try {
      const nextData = await fetchDatabase();
      setData({
        categories: nextData.categories || [],
        items: nextData.items || [],
        sales: nextData.sales || [],
        stockIn: nextData.stockIn || [],
        suppliers: nextData.suppliers || [],
        movements: nextData.movements || [],
        salesReps: nextData.salesReps || [],
        expenses: nextData.expenses || [],
      });
      setStatus("Records loaded");
    } catch (error) {
      setStatus(error.message);
    }
  }, []);

  useEffect(() => {
    if (session) {
      loadData();
    }
  }, [session, loadData]);

  useEffect(() => {
    if (session && !visibleTabs.some((tab) => tab.id === activeTab)) {
      setActiveTab("dashboard");
    }
  }, [activeTab, session, visibleTabs]);

  const dateRange = useMemo(() => getDateRange(dateFilter), [dateFilter]);
  const view = useMemo(() => buildViewModel(data, dateRange), [data, dateRange]);
  const filteredItems = data.items.filter((item) =>
    `${item.Item_Name} ${item.Item_ID} ${item.Status || "Active"}`.toLowerCase().includes(query.toLowerCase())
  );
  const activeItems = data.items.filter((item) => (item.Status || "Active") === "Active");

  function addToCart(item) {
    setSaleCart((current) => {
      const existing = current.find((entry) => entry.Item_ID === item.Item_ID);
      if (existing) {
        return current.map((entry) =>
          entry.Item_ID === item.Item_ID
            ? { ...entry, Qty_Sold: Math.min(Number(item.Current_Stock || 0), Number(entry.Qty_Sold || 0) + 1) }
            : entry
        );
      }
      return [...current, { Item_ID: item.Item_ID, Qty_Sold: 1 }];
    });
    setStatus(`${item.Item_Name} added to sale cart`);
  }

  function updateCartQty(itemId, qty) {
    const item = data.items.find((entry) => entry.Item_ID === itemId);
    const maxQty = Number(item?.Current_Stock || 0);
    const nextQty = Math.max(1, Math.min(maxQty || 1, Number(qty) || 1));
    setSaleCart((current) => current.map((entry) => (entry.Item_ID === itemId ? { ...entry, Qty_Sold: nextQty } : entry)));
  }

  function removeCartItem(itemId) {
    setSaleCart((current) => current.filter((entry) => entry.Item_ID !== itemId));
  }

  async function submitSingleSale(payload, reset) {
    setStatus("Saving sale...");
    try {
      const result = await addSale({
        ...payload,
        Sales_Rep_ID: session?.repId || "",
        Sales_Rep_Name: session?.name || "",
      });
      reset?.();
      const receiptNo = result.receiptNo || result.saleId || result.data?.sales?.slice(-1)?.[0]?.Receipt_No;
      const nextData = result.data || (await fetchDatabase());
      setData({
        categories: nextData.categories || [],
        items: nextData.items || [],
        sales: nextData.sales || [],
        stockIn: nextData.stockIn || [],
        suppliers: nextData.suppliers || [],
        movements: nextData.movements || [],
        salesReps: nextData.salesReps || [],
        expenses: nextData.expenses || [],
      });
      setLastReceipt(buildReceipt(receiptNo, nextData.sales || [], nextData.items || [], session?.name || ""));
      setStatus("Sale saved successfully");
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function submitBasketSale(date) {
    if (!saleCart.length) {
      setStatus("Sale cart is empty");
      return;
    }
    setStatus("Saving basket sale...");
    try {
      const result = await addBasketSale({
        Date: date,
        Items: saleCart,
        Sales_Rep_ID: session?.repId || "",
        Sales_Rep_Name: session?.name || "",
      });
      setSaleCart([]);
      const nextData = result.data || (await fetchDatabase());
      setData({
        categories: nextData.categories || [],
        items: nextData.items || [],
        sales: nextData.sales || [],
        stockIn: nextData.stockIn || [],
        suppliers: nextData.suppliers || [],
        movements: nextData.movements || [],
        salesReps: nextData.salesReps || [],
        expenses: nextData.expenses || [],
      });
      setLastReceipt(buildReceipt(result.receiptNo, nextData.sales || [], nextData.items || [], session?.name || ""));
      setStatus("Basket sale saved successfully");
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function submitScannedStock(scan) {
    const rows = scan.rows.filter((row) => Number(row.quantity || 0) > 0 && (row.Item_ID || (row.createNew && row.Category_ID)));
    if (!rows.length) {
      setStatus("No reviewed supply rows to save");
      return;
    }
    setStatus("Saving scanned supply items...");
    try {
      for (const row of rows) {
        let itemId = row.Item_ID;
        if (!itemId && row.createNew) {
          const created = await addItem({
            Item_Name: row.itemName,
            Category_ID: row.Category_ID,
            Cost_Price: row.unitCost,
            Selling_Price: row.sellingPrice || row.unitCost,
            Current_Stock: 0,
            Status: "Active",
          });
          const createdItems = created.data?.items || [];
          itemId = [...createdItems].reverse().find((item) => normalizeName(item.Item_Name) === normalizeName(row.itemName))?.Item_ID;
          if (!itemId) throw new Error(`Could not create ${row.itemName}`);
        }
        await addStock({
          Date: scan.Date,
          Item_ID: itemId,
          Qty_Added: row.quantity,
          Unit_Cost: row.unitCost,
          Supplier_ID: scan.Supplier_ID,
          Invoice_No: scan.Invoice_No,
        });
      }
      await loadData();
      setStatus(`${rows.length} scanned supply items saved`);
    } catch (error) {
      setStatus(error.message);
      throw error;
    }
  }

  async function submit(action, payload, reset) {
    setStatus("Saving...");
    try {
      await action(payload);
      reset?.();
      await loadData();
      setStatus("Saved successfully");
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function login(credentials) {
    let sheetData = null;
    try {
      sheetData = await fetchDatabase();
      setData({
        categories: sheetData.categories || [],
        items: sheetData.items || [],
        sales: sheetData.sales || [],
        stockIn: sheetData.stockIn || [],
        suppliers: sheetData.suppliers || [],
        movements: sheetData.movements || [],
        salesReps: sheetData.salesReps || [],
        expenses: sheetData.expenses || [],
      });
    } catch {
      sheetData = null;
    }

    const loginUsers = buildLoginUsers(users, sheetData?.salesReps || []);
    const nextSession = loginUsers.find(
      (user) =>
        user.username.toLowerCase() === credentials.username.trim().toLowerCase() &&
        user.password === credentials.password
    );

    if (!nextSession) {
      throw new Error("Login failed. Check the username and password.");
    }

    const safeSession = { role: nextSession.role, name: nextSession.name, username: nextSession.username, repId: nextSession.repId || "" };
    window.localStorage.setItem("wonspareparts-session", JSON.stringify(safeSession));
    setSession(safeSession);
    setActiveTab("dashboard");
    setSidebarOpen(false);
  }

  function updateCredentials(nextUsers) {
    window.localStorage.setItem("wonspareparts-users", JSON.stringify(nextUsers));
    setUsers(nextUsers);
    setStatus("Login credentials updated");
  }

  async function submitSalesRep(action, payload, reset) {
    setStatus("Saving sales representative...");
    try {
      const result = await action(payload);
      reset?.();
      const nextData = result.data || (await fetchDatabase());
      setData({
        categories: nextData.categories || [],
        items: nextData.items || [],
        sales: nextData.sales || [],
        stockIn: nextData.stockIn || [],
        suppliers: nextData.suppliers || [],
        movements: nextData.movements || [],
        salesReps: nextData.salesReps || [],
        expenses: nextData.expenses || [],
      });
      const uniqueUsers = buildLoginUsers(users, nextData.salesReps || []);
      window.localStorage.setItem("wonspareparts-users", JSON.stringify(uniqueUsers));
      setUsers(uniqueUsers);
      setStatus("Sales representative saved");
    } catch (error) {
      setStatus(error.message);
      throw error;
    }
  }

  function logout() {
    window.localStorage.removeItem("wonspareparts-session");
    setSession(null);
    setData(emptyData);
    setStatus("Logged out");
    setActiveTab("dashboard");
    setSidebarOpen(false);
  }

  if (!session) {
    return <LoginScreen onLogin={login} />;
  }

  return (
    <main className="app-shell">
      <Sidebar
        activeTab={activeTab}
        open={sidebarOpen}
        session={session}
        status={status}
        tabs={visibleTabs}
        onClose={() => setSidebarOpen(false)}
        onLogout={logout}
        onRefresh={loadData}
        onSelectTab={(tabId) => {
          setActiveTab(tabId);
          setSidebarOpen(false);
        }}
        onToggle={() => setSidebarOpen((open) => !open)}
      />

      <section className="workspace">
        <HeaderBar query={query} onQueryChange={setQuery} />

        {activeTab === "dashboard" && (
          <Dashboard
            view={view}
            items={session.role === "manager" ? filteredItems : filteredItems.filter((item) => (item.Status || "Active") === "Active")}
            data={data}
            role={session.role}
            dateFilter={dateFilter}
            dateRange={dateRange}
            onDateFilterChange={setDateFilter}
            onNavigate={setActiveTab}
          />
        )}
        {activeTab === "sales" && (
          <SalesForm
            items={activeItems}
            cart={saleCart}
            receipt={lastReceipt}
            onSubmit={submitSingleSale}
            onCartQty={updateCartQty}
            onRemoveCartItem={removeCartItem}
            onCheckout={submitBasketSale}
            onClearCart={() => setSaleCart([])}
            onClearReceipt={() => setLastReceipt(null)}
          />
        )}
        {activeTab === "stock" && <StockForm items={activeItems} suppliers={data.suppliers} onSubmit={(payload, reset) => submit(addStock, payload, reset)} />}
        {activeTab === "aiSupply" && session.role === "manager" && (
          <AiSupplyScanPanel
            items={activeItems}
            categories={data.categories}
            suppliers={data.suppliers}
            onAnalyze={analyzeSupplyScan}
            onSaveRows={submitScannedStock}
          />
        )}
        {activeTab === "suppliers" && session.role === "manager" && (
          <SuppliersPanel
            suppliers={data.suppliers}
            onSubmit={(payload, reset) => submit(addSupplier, payload, reset)}
            onUpdate={(payload) => submit(updateSupplier, payload)}
          />
        )}
        {activeTab === "history" && session.role === "manager" && (
          <StockHistoryPanel movements={data.movements} items={data.items} />
        )}
        {activeTab === "salesHistory" && session.role === "manager" && (
          <SalesHistoryPanel sales={data.sales} items={data.items} />
        )}
        {activeTab === "items" && (
          <ItemsPanel
            items={session.role === "manager" ? filteredItems : filteredItems.filter((item) => (item.Status || "Active") === "Active")}
            categories={data.categories}
            role={session.role}
            onSubmit={(payload, reset) => submit(addItem, payload, reset)}
            onUpdate={(payload) => submit(updateItem, payload)}
            onAddToCart={addToCart}
          />
        )}
        {activeTab === "expenses" && (
          <ExpensesPanel expenses={data.expenses} onSubmit={(payload, reset) => submit(addExpense, payload, reset)} />
        )}
        {activeTab === "categories" && (
          <CategoriesPanel
            categories={data.categories}
            onSubmit={(payload, reset) => submit(addCategory, payload, reset)}
            onUpdate={(payload) => submit(updateCategory, payload)}
          />
        )}
        {activeTab === "settings" && session.role === "manager" && (
          <SettingsPanel
            users={users}
            salesReps={data.salesReps}
            onSave={updateCredentials}
            onAddSalesRep={(payload, reset) => submitSalesRep(addSalesRep, payload, reset)}
            onUpdateSalesRep={(payload) => submitSalesRep(updateSalesRep, payload)}
            onCheckConnection={checkConnection}
          />
        )}
      </section>
    </main>
  );
}

