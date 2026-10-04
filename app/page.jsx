"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const DATA_CACHE_KEY = "wonspareparts-offline-data";
const SYNC_QUEUE_KEY = "wonspareparts-sync-queue";
const LOGIN_CACHE_KEY = "wonspareparts-offline-logins";

function normalizeShopData(nextData = {}) {
  return {
    settings: { ...defaultSettings, ...(nextData.settings || {}) },
    categories: nextData.categories || [],
    items: nextData.items || [],
    sales: nextData.sales || [],
    stockIn: nextData.stockIn || [],
    suppliers: nextData.suppliers || [],
    movements: nextData.movements || [],
    salesReps: nextData.salesReps || [],
    expenses: nextData.expenses || [],
  };
}

function readStoredJson(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

function saveStoredJson(key, value) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function buildOfflineReceiptNo() {
  return `OFF-${Date.now().toString(36).toUpperCase()}`;
}

function canSaveOffline(error) {
  if (typeof window !== "undefined" && !window.navigator.onLine) return true;
  return /failed to fetch|network|offline|load failed/i.test(error?.message || "");
}

function normalizeUsername(value) {
  return String(value || "").trim().toLowerCase();
}

async function hashLoginPassword(username, password) {
  const input = `wonspareparts:${normalizeUsername(username)}:${String(password || "")}`;
  if (window.crypto?.subtle) {
    const bytes = new TextEncoder().encode(input);
    const digest = await window.crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  return window.btoa(unescape(encodeURIComponent(input)));
}

async function buildOfflineLoginRecord({ username, password, role, name, repId = "" }) {
  return {
    username: normalizeUsername(username),
    passwordHash: await hashLoginPassword(username, password),
    role,
    name,
    repId,
    cachedAt: new Date().toISOString(),
  };
}

function mergeLoginRecords(existing, nextRecords) {
  const merged = new Map();
  existing.forEach((record) => {
    if (record?.username && record?.passwordHash) merged.set(record.username, record);
  });
  nextRecords.forEach((record) => {
    if (record?.username && record?.passwordHash) merged.set(record.username, record);
  });
  return Array.from(merged.values());
}

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
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const handlingHistoryRef = useRef(false);
  const syncingRef = useRef(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("wonspareparts-session");
    if (stored) {
      setSession(JSON.parse(stored));
    }
    const storedUsers = window.localStorage.getItem("wonspareparts-users");
    if (storedUsers) {
      window.localStorage.removeItem("wonspareparts-users");
    }
    setIsOnline(window.navigator.onLine);
    setPendingSyncCount(readStoredJson(SYNC_QUEUE_KEY, []).length);
  }, []);

  useEffect(() => {
    function updateNetworkStatus() {
      setIsOnline(window.navigator.onLine);
    }

    window.addEventListener("online", updateNetworkStatus);
    window.addEventListener("offline", updateNetworkStatus);
    return () => {
      window.removeEventListener("online", updateNetworkStatus);
      window.removeEventListener("offline", updateNetworkStatus);
    };
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
  const syncActions = useMemo(() => ({
    addBasketSale,
    addCategory,
    addExpense,
    addItem,
    addSalesRep,
    addStock,
    addSupplier,
    updateCategory,
    updateItem,
    updateSalesRep,
    updateSettings,
    updateSupplier,
  }), []);

  const applyShopData = useCallback((nextData, message) => {
    const normalized = normalizeShopData(nextData);
    setData(normalized);
    saveStoredJson(DATA_CACHE_KEY, normalized);
    if (message) setStatus(message);
    return normalized;
  }, []);

  const cacheOfflineLogins = useCallback(async (nextData, currentSession, currentCredentials) => {
    const existing = readStoredJson(LOGIN_CACHE_KEY, []);
    const records = [];
    const normalized = normalizeShopData(nextData);

    if (currentSession?.username && currentCredentials?.password) {
      records.push(await buildOfflineLoginRecord({
        username: currentSession.username,
        password: currentCredentials.password,
        role: currentSession.role,
        name: currentSession.name,
        repId: currentSession.repId || "",
      }));
    }

    for (const rep of normalized.salesReps) {
      if ((rep.Status || "Active") !== "Active" || !rep.Username || !rep.Password) continue;
      records.push(await buildOfflineLoginRecord({
        username: rep.Username,
        password: rep.Password,
        role: "sales",
        name: rep.Rep_Name || "Sales Representative",
        repId: rep.Rep_ID || "",
      }));
    }

    if (records.length) {
      saveStoredJson(LOGIN_CACHE_KEY, mergeLoginRecords(existing, records));
    }
  }, []);

  const saveQueue = useCallback((queue) => {
    saveStoredJson(SYNC_QUEUE_KEY, queue);
    setPendingSyncCount(queue.length);
  }, []);

  const queueOfflineAction = useCallback((actionName, payload, label) => {
    const queue = readStoredJson(SYNC_QUEUE_KEY, []);
    const nextQueue = [
      ...queue,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        actionName,
        payload,
        label,
        createdAt: new Date().toISOString(),
      },
    ];
    saveQueue(nextQueue);
    setStatus(`${label} saved offline. It will sync when internet returns.`);
  }, [saveQueue]);

  const loadData = useCallback(async () => {
    setStatus("Refreshing records...");
    try {
      const nextData = await fetchDatabase();
      applyShopData(nextData, "Records loaded");
      await cacheOfflineLogins(nextData, session);
    } catch (error) {
      const cachedData = readStoredJson(DATA_CACHE_KEY, null);
      if (cachedData) {
        setData(normalizeShopData(cachedData));
        setStatus("Offline mode: showing the last loaded records");
      } else {
        setStatus(error.message);
      }
    }
  }, [applyShopData, cacheOfflineLogins, session]);

  const syncOfflineQueue = useCallback(async () => {
    if (!window.navigator.onLine || syncingRef.current) return;
    const queue = readStoredJson(SYNC_QUEUE_KEY, []);
    if (!queue.length) {
      setPendingSyncCount(0);
      return;
    }

    syncingRef.current = true;
    setStatus(`Syncing ${queue.length} offline record${queue.length === 1 ? "" : "s"}...`);
    const remaining = [];

    for (const entry of queue) {
      const action = syncActions[entry.actionName];
      if (!action) {
        remaining.push(entry);
        continue;
      }

      try {
        await action(entry.payload);
      } catch {
        remaining.push(entry);
        break;
      }
    }

    saveQueue(remaining);
    syncingRef.current = false;

    if (remaining.length) {
      setStatus(`${remaining.length} offline record${remaining.length === 1 ? "" : "s"} still pending`);
      return;
    }

    await loadData();
    setStatus("Offline records synced successfully");
  }, [loadData, saveQueue, syncActions]);

  useEffect(() => {
    if (session) {
      loadData();
    }
  }, [session, loadData]);

  useEffect(() => {
    if (session && isOnline && pendingSyncCount > 0) {
      syncOfflineQueue();
    }
  }, [isOnline, pendingSyncCount, session, syncOfflineQueue]);

  useEffect(() => {
    if (session && !visibleTabs.some((tab) => tab.id === activeTab)) {
      setActiveTab("dashboard");
    }
  }, [activeTab, session, visibleTabs]);

  useEffect(() => {
    if (!session) return;

    const state = { wonspareparts: true, tab: activeTab, sidebarOpen };
    if (!window.history.state?.wonspareparts) {
      window.history.replaceState(state, "");
      return;
    }

    if (handlingHistoryRef.current) {
      handlingHistoryRef.current = false;
      return;
    }

    if (window.history.state.tab !== activeTab || window.history.state.sidebarOpen !== sidebarOpen) {
      window.history.pushState(state, "");
    }
  }, [activeTab, session, sidebarOpen]);

  useEffect(() => {
    if (!session) return;

    function handleAppBack(event) {
      const state = event.state;
      if (!state?.wonspareparts) return;

      handlingHistoryRef.current = true;
      setActiveTab(state.tab || "dashboard");
      setSidebarOpen(Boolean(state.sidebarOpen));
    }

    window.addEventListener("popstate", handleAppBack);
    return () => window.removeEventListener("popstate", handleAppBack);
  }, [session]);

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
    const payload = {
      Date: date,
      Items: saleCart,
      Sales_Rep_ID: session?.repId || "",
      Sales_Rep_Name: session?.name || "",
    };
    setStatus("Saving basket sale...");
    try {
      const result = await addBasketSale(payload);
      setSaleCart([]);
      const nextData = result.data || (await fetchDatabase());
      applyShopData(nextData);
      setLastReceipt(buildReceipt(result.receiptNo, nextData.sales || [], nextData.items || [], session?.name || "", appSettings));
      setStatus("Basket sale saved successfully");
    } catch (error) {
      if (canSaveOffline(error)) {
        const receiptNo = buildOfflineReceiptNo();
        const itemMap = Object.fromEntries(data.items.map((item) => [item.Item_ID, item]));
        const offlineSales = saleCart.map((entry, index) => {
          const item = itemMap[entry.Item_ID] || {};
          const qty = Number(entry.Qty_Sold || 0);
          const sellingPrice = Number(item.Selling_Price || 0);
          const costPrice = Number(item.Cost_Price || 0);
          return {
            Sale_ID: `${receiptNo}-${index + 1}`,
            Receipt_No: receiptNo,
            Date: date,
            Item_ID: entry.Item_ID,
            Qty_Sold: qty,
            Unit_Selling_Price: sellingPrice,
            Total_Revenue: sellingPrice * qty,
            Total_COGS: costPrice * qty,
            Sales_Rep_ID: session?.repId || "",
            Sales_Rep_Name: session?.name || "",
            Sync_Status: "Pending",
          };
        });
        const nextData = normalizeShopData({
          ...data,
          sales: [...data.sales, ...offlineSales],
          items: data.items.map((item) => {
            const cartItem = saleCart.find((entry) => entry.Item_ID === item.Item_ID);
            if (!cartItem) return item;
            return {
              ...item,
              Current_Stock: Math.max(0, Number(item.Current_Stock || 0) - Number(cartItem.Qty_Sold || 0)),
            };
          }),
        });
        setData(nextData);
        saveStoredJson(DATA_CACHE_KEY, nextData);
        setSaleCart([]);
        setLastReceipt(buildReceipt(receiptNo, offlineSales, data.items, session?.name || "", appSettings));
        queueOfflineAction("addBasketSale", payload, "Basket sale");
        return;
      }
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

  async function submit(actionName, action, payload, reset) {
    setStatus("Saving...");
    try {
      await action(payload);
      reset?.();
      await loadData();
      setStatus("Saved successfully");
    } catch (error) {
      if (canSaveOffline(error)) {
        queueOfflineAction(actionName, payload, "Record");
        reset?.();
        return;
      }
      setStatus(error.message);
    }
  }

  async function login(credentials) {
    if (!window.navigator.onLine) {
      const username = normalizeUsername(credentials.username);
      const passwordHash = await hashLoginPassword(username, credentials.password);
      const cachedUsers = readStoredJson(LOGIN_CACHE_KEY, []);
      const cachedUser = cachedUsers.find((user) => user.username === username && user.passwordHash === passwordHash);
      if (!cachedUser) {
        throw new Error("Offline login failed. This user must login online once on this device before offline login can work.");
      }

      const cachedData = normalizeShopData(readStoredJson(DATA_CACHE_KEY, emptyData));
      setData(cachedData);
      const offlineSession = {
        role: cachedUser.role,
        name: cachedUser.name,
        username: cachedUser.username,
        repId: cachedUser.repId || "",
        offline: true,
      };
      window.localStorage.setItem("wonspareparts-session", JSON.stringify(offlineSession));
      setSession(offlineSession);
      setStatus("Offline login successful. Records will sync when internet returns.");
      setActiveTab("dashboard");
      setSidebarOpen(false);
      return;
    }

    try {
      const result = await loginUser(credentials);
      const sheetData = result.data || {};
      applyShopData(sheetData);
      const safeSession = result.session;
      await cacheOfflineLogins(sheetData, safeSession, credentials);
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
      applyShopData(nextData);
      if (payload.manager_password) {
        await cacheOfflineLogins(nextData, {
          role: "manager",
          name: payload.manager_name || "Manager",
          username: payload.manager_username,
          repId: "",
        }, { password: payload.manager_password });
      } else {
        await cacheOfflineLogins(nextData, session);
      }
      const nextUsers = buildLoginUsers([{ role: "manager", name: payload.manager_name, username: payload.manager_username, password: "" }], nextData.salesReps || []);
      window.localStorage.removeItem("wonspareparts-users");
      setUsers(nextUsers);
      setStatus("Settings saved");
    } catch (error) {
      if (canSaveOffline(error)) {
        queueOfflineAction("updateSettings", payload, "Settings");
        setStatus("Settings saved offline. They will sync when internet returns.");
        return;
      }
      setStatus(error.message);
      throw error;
    }
  }

  async function submitSalesRep(actionName, action, payload, reset) {
    setStatus("Saving sales representative...");
    try {
      const result = await action(payload);
      reset?.();
      const nextData = result.data || (await fetchDatabase());
      applyShopData(nextData);
      await cacheOfflineLogins(nextData, session);
      const uniqueUsers = buildLoginUsers(users, nextData.salesReps || []);
      window.localStorage.removeItem("wonspareparts-users");
      setUsers(uniqueUsers);
      setStatus("Sales representative saved");
    } catch (error) {
      if (canSaveOffline(error)) {
        queueOfflineAction(actionName, payload, "Sales representative");
        reset?.();
        return;
      }
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
          isOnline={isOnline}
          pendingSyncCount={pendingSyncCount}
          onLowStockClick={session.role === "manager" ? () => setActiveTab("lowStock") : undefined}
          onQueryChange={setQuery}
          onSyncNow={syncOfflineQueue}
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
        {activeTab === "stock" && <StockForm items={activeItems} suppliers={data.suppliers} onSubmit={(payload, reset) => submit("addStock", addStock, payload, reset)} />}
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
            onSubmit={(payload, reset) => submit("addSupplier", addSupplier, payload, reset)}
            onUpdate={(payload) => submit("updateSupplier", updateSupplier, payload)}
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
            onSubmit={(payload, reset) => submit("addItem", addItem, payload, reset)}
            onUpdate={(payload) => submit("updateItem", updateItem, payload)}
            onAddToCart={addToCart}
          />
        )}
        {activeTab === "expenses" && (
          <ExpensesPanel expenses={data.expenses} onSubmit={(payload, reset) => submit("addExpense", addExpense, payload, reset)} />
        )}
        {activeTab === "categories" && (
          <CategoriesPanel
            categories={data.categories}
            onSubmit={(payload, reset) => submit("addCategory", addCategory, payload, reset)}
            onUpdate={(payload) => submit("updateCategory", updateCategory, payload)}
          />
        )}
        {activeTab === "settings" && session.role === "manager" && (
          <SettingsPanel
            users={users}
            settings={appSettings}
            salesReps={data.salesReps}
            onSaveSettings={saveAppSettings}
            onAddSalesRep={(payload, reset) => submitSalesRep("addSalesRep", addSalesRep, payload, reset)}
            onUpdateSalesRep={(payload) => submitSalesRep("updateSalesRep", updateSalesRep, payload)}
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

