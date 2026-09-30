"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { addBasketSale, addCategory, addExpense, addItem, addSalesRep, addStock, addSupplier, analyzeSupplyScan, checkConnection, fetchDatabase, loginUser, updateCategory, updateItem, updateSalesRep, updateSettings, updateSupplier } from "../lib/api";
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
import { FloatingCartButton } from "../components/FloatingCartButton";
import { HubPanel } from "../components/HubPanel";
import { LowStockPanel } from "../components/LowStockPanel";
import { buildLoginUsers, buildReceipt, buildViewModel, getDateRange, normalizeName } from "../lib/business";
import { defaultSettings, defaultUsers, emptyData, roleTabs, sidebarSections, tabs, today } from "../lib/constants";

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
      window.localStorage.removeItem("wonspareparts-users");
    }
  }, []);

  const visibleTabs = useMemo(() => roleTabs[session?.role] || [], [session?.role]);
  const visibleSections = useMemo(() => sidebarSections[session?.role] || [], [session?.role]);
  const appSettings = useMemo(() => ({ ...defaultSettings, ...(data.settings || {}) }), [data.settings]);
  const lowStockLimit = Number(appSettings.low_stock_limit || defaultSettings.low_stock_limit);
  const cartCount = saleCart.reduce((sum, entry) => sum + Number(entry.Qty_Sold || 0), 0);
  const tabMap = useMemo(() => Object.fromEntries(tabs.map((tab) => [tab.id, tab])), []);
  const inventoryCards = useMemo(() => [
    { ...tabMap.items, description: "Create, edit, price, and add items to cart." },
    { ...tabMap.stock, description: "Record new stock purchases and supplier invoices." },
    { ...tabMap.categories, description: "Organize items into active or inactive categories." },
    { ...tabMap.suppliers, description: "Manage supplier names, phone numbers, and status." },
    { ...tabMap.aiSupply, description: "Scan or paste supply sheets into reviewed stock rows." },
  ], [tabMap]);
  const reportCards = useMemo(() => [
    { ...tabMap.salesHistory, description: "Review receipts, totals, and reprint old sales." },
    { ...tabMap.history, description: "Track stock movement from purchases, sales, and edits." },
    { ...tabMap.lowStock, description: "Open only items at or below the low-stock limit." },
  ], [tabMap]);

  const loadData = useCallback(async () => {
    setStatus("Refreshing records...");
    try {
      const nextData = await fetchDatabase();
      setData({
        settings: { ...defaultSettings, ...(nextData.settings || {}) },
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
  const lowStockItems = filteredItems.filter((item) => Number(item.Current_Stock || 0) <= lowStockLimit);
  const outOfStockCount = lowStockItems.filter((item) => Number(item.Current_Stock || 0) <= 0).length;
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
        settings: { ...defaultSettings, ...(nextData.settings || {}) },
        categories: nextData.categories || [],
        items: nextData.items || [],
        sales: nextData.sales || [],
        stockIn: nextData.stockIn || [],
        suppliers: nextData.suppliers || [],
        movements: nextData.movements || [],
        salesReps: nextData.salesReps || [],
        expenses: nextData.expenses || [],
      });
      setLastReceipt(buildReceipt(result.receiptNo, nextData.sales || [], nextData.items || [], session?.name || "", appSettings));
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
    try {
      const result = await loginUser(credentials);
      const sheetData = result.data || {};
      setData({
        settings: { ...defaultSettings, ...(sheetData.settings || {}) },
        categories: sheetData.categories || [],
        items: sheetData.items || [],
        sales: sheetData.sales || [],
        stockIn: sheetData.stockIn || [],
        suppliers: sheetData.suppliers || [],
        movements: sheetData.movements || [],
        salesReps: sheetData.salesReps || [],
        expenses: sheetData.expenses || [],
      });
      const safeSession = result.session;
      window.localStorage.setItem("wonspareparts-session", JSON.stringify(safeSession));
      setSession(safeSession);
      setActiveTab("dashboard");
      setSidebarOpen(false);
      return;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async function saveAppSettings(payload) {
    setStatus("Saving settings...");
    try {
      const result = await updateSettings(payload);
      const nextData = result.data || (await fetchDatabase());
      setData({
        settings: { ...defaultSettings, ...(nextData.settings || {}) },
        categories: nextData.categories || [],
        items: nextData.items || [],
        sales: nextData.sales || [],
        stockIn: nextData.stockIn || [],
        suppliers: nextData.suppliers || [],
        movements: nextData.movements || [],
        salesReps: nextData.salesReps || [],
        expenses: nextData.expenses || [],
      });
      const nextUsers = buildLoginUsers([{ role: "manager", name: payload.manager_name, username: payload.manager_username, password: "" }], nextData.salesReps || []);
      window.localStorage.removeItem("wonspareparts-users");
      setUsers(nextUsers);
      setStatus("Settings saved");
    } catch (error) {
      setStatus(error.message);
      throw error;
    }
  }

  async function submitSalesRep(action, payload, reset) {
    setStatus("Saving sales representative...");
    try {
      const result = await action(payload);
      reset?.();
      const nextData = result.data || (await fetchDatabase());
      setData({
        settings: { ...defaultSettings, ...(nextData.settings || {}) },
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
      window.localStorage.removeItem("wonspareparts-users");
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
        sections={visibleSections}
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
        <HeaderBar
          query={query}
          lowStockCount={session.role === "manager" ? lowStockItems.length : 0}
          outOfStockCount={session.role === "manager" ? outOfStockCount : 0}
          onLowStockClick={session.role === "manager" ? () => setActiveTab("lowStock") : undefined}
          onQueryChange={setQuery}
        />

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
            lowStockLimit={lowStockLimit}
          />
        )}
        {activeTab === "sales" && (
          <SalesForm
            items={activeItems}
            cart={saleCart}
            receipt={lastReceipt}
            onAddToCart={addToCart}
            onCartQty={updateCartQty}
            onRemoveCartItem={removeCartItem}
            onCheckout={submitBasketSale}
            onClearCart={() => setSaleCart([])}
            onClearReceipt={() => setLastReceipt(null)}
          />
        )}
        {activeTab === "inventory" && session.role === "manager" && (
          <HubPanel
            eyebrow="Inventory"
            title="Inventory Tools"
            description="Everything for items, stock, suppliers, categories, and scanned supply records."
            cards={inventoryCards}
            onNavigate={setActiveTab}
          />
        )}
        {activeTab === "reports" && session.role === "manager" && (
          <HubPanel
            eyebrow="Reports"
            title="Business Reports"
            description="Review sales, stock movement, and low-stock action points."
            cards={reportCards}
            onNavigate={setActiveTab}
          />
        )}
        {activeTab === "lowStock" && session.role === "manager" && (
          <LowStockPanel
            items={lowStockItems}
            categoryNames={view.categoryNames}
            lowStockLimit={lowStockLimit}
            onAddToCart={addToCart}
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
          <SalesHistoryPanel sales={data.sales} items={data.items} receiptSettings={appSettings} />
        )}
        {activeTab === "items" && (
          <ItemsPanel
            items={session.role === "manager" ? filteredItems : filteredItems.filter((item) => (item.Status || "Active") === "Active")}
            categories={data.categories}
            role={session.role}
            lowStockLimit={lowStockLimit}
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
            settings={appSettings}
            salesReps={data.salesReps}
            onSaveSettings={saveAppSettings}
            onAddSalesRep={(payload, reset) => submitSalesRep(addSalesRep, payload, reset)}
            onUpdateSalesRep={(payload) => submitSalesRep(updateSalesRep, payload)}
            onCheckConnection={checkConnection}
          />
        )}
      </section>
      <FloatingCartButton
        active={activeTab === "sales"}
        count={cartCount}
        onOpen={() => {
          setActiveTab("sales");
          setSidebarOpen(false);
        }}
      />
    </main>
  );
}

