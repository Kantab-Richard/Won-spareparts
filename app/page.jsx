"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  Boxes,
  CircleDollarSign,
  ClipboardList,
  History,
  Pencil,
  LogOut,
  LayoutDashboard,
  Menu,
  PackagePlus,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Tags,
  TriangleAlert,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { addBasketSale, addCategory, addExpense, addItem, addSale, addStock, addSupplier, checkConnection, fetchDatabase, updateCategory, updateItem, updateSupplier } from "../lib/api";

const today = new Date().toISOString().slice(0, 10);
const money = new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" });
const dateFilterOptions = [
  { id: "today", label: "Today" },
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
  { id: "custom", label: "Custom" },
];

const tabs = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "sales", label: "Sales", icon: CircleDollarSign },
  { id: "salesHistory", label: "Sales History", icon: ClipboardList },
  { id: "stock", label: "Stock In", icon: PackagePlus },
  { id: "suppliers", label: "Suppliers", icon: Truck },
  { id: "history", label: "Stock History", icon: History },
  { id: "items", label: "Items", icon: Boxes },
  { id: "expenses", label: "Expenses", icon: ReceiptText },
  { id: "categories", label: "Categories", icon: Tags },
  { id: "settings", label: "Settings", icon: Settings },
];

const emptyData = { categories: [], items: [], sales: [], stockIn: [], suppliers: [], movements: [], expenses: [] };
const defaultUsers = [
  { username: "manager", password: "manager123", role: "manager", name: "Manager" },
  { username: "sales", password: "sales123", role: "sales", name: "Sales Representative" },
];
const roleTabs = {
  manager: tabs,
  sales: tabs.filter((tab) => ["dashboard", "sales", "items"].includes(tab.id)),
};

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

  const visibleTabs = roleTabs[session?.role] || [];

  async function loadData() {
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
        expenses: nextData.expenses || [],
      });
      setStatus(nextData === data ? "Loaded" : "Records loaded");
    } catch (error) {
      setStatus(error.message);
    }
  }

  useEffect(() => {
    if (session) {
      loadData();
    }
  }, [session]);

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

  async function submitBasketSale(date) {
    if (!saleCart.length) {
      setStatus("Sale cart is empty");
      return;
    }
    setStatus("Saving basket sale...");
    try {
      await addBasketSale({ Date: date, Items: saleCart });
      setSaleCart([]);
      await loadData();
      setStatus("Basket sale saved successfully");
    } catch (error) {
      setStatus(error.message);
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

  function login(credentials) {
    const nextSession = users.find(
      (user) =>
        user.username.toLowerCase() === credentials.username.trim().toLowerCase() &&
        user.password === credentials.password
    );

    if (!nextSession) {
      throw new Error("Login failed. Check the username and password.");
    }

    const safeSession = { role: nextSession.role, name: nextSession.name, username: nextSession.username };
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
      {sidebarOpen && <button className="sidebar-backdrop" type="button" onClick={() => setSidebarOpen(false)} />}
      <aside className={sidebarOpen ? "sidebar open" : "sidebar"}>
        <div className="sidebar-header">
          <div className="brand-mark">
            <Image src="/wonspareparts-banner.png" alt="WONSPAREPARTS" width={2172} height={724} priority />
          </div>
          <button
            className="mobile-menu-button"
            type="button"
            onClick={() => setSidebarOpen((open) => !open)}
            title={sidebarOpen ? "Close navigation" : "Open navigation"}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        <div className="user-card">
          <div className="user-avatar">
            {session.role === "manager" ? <ShieldCheck size={20} /> : <UserRound size={20} />}
          </div>
          <div>
            <strong>{session.name}</strong>
            <span>{session.role === "manager" ? "Manager Interface" : "Sales Representative Interface"}</span>
          </div>
        </div>
        <nav className="tabs" aria-label="Main navigation">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={activeTab === tab.id ? "tab active" : "tab"}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSidebarOpen(false);
                }}
                title={tab.label}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="sync-box">
          <span>{status}</span>
          <button className="icon-button" onClick={loadData} title="Refresh records">
            <RefreshCw size={17} />
          </button>
          <button className="icon-button" onClick={logout} title="Log out">
            <LogOut size={17} />
          </button>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Sales & Inventory</p>
            <h1>WONSPAREPARTS Manager</h1>
          </div>
          <div className="search">
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search items" />
          </div>
        </header>

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
            onSubmit={(payload, reset) => submit(addSale, payload, reset)}
            onCartQty={updateCartQty}
            onRemoveCartItem={removeCartItem}
            onCheckout={submitBasketSale}
            onClearCart={() => setSaleCart([])}
          />
        )}
        {activeTab === "stock" && <StockForm items={activeItems} suppliers={data.suppliers} onSubmit={(payload, reset) => submit(addStock, payload, reset)} />}
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
          <SettingsPanel users={users} onSave={updateCredentials} onCheckConnection={checkConnection} />
        )}
      </section>
    </main>
  );
}

function LoginScreen({ onLogin }) {
  const [form, setForm] = useForm({ username: "", password: "" });
  const [error, setError] = useState("");

  function submitLogin(event) {
    event.preventDefault();
    setError("");
    try {
      onLogin(form);
    } catch (loginError) {
      setError(loginError.message);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-panel">
        <div className="brand-mark login-brand">
          <Image src="/wonspareparts-banner.png" alt="WONSPAREPARTS" width={2172} height={724} priority />
        </div>
        <div>
          <p className="eyebrow">Secure Access</p>
          <h1>WONSPAREPARTS Manager</h1>
        </div>
        <form className="login-form" onSubmit={submitLogin}>
          <Field label="Username" value={form.username} onChange={(username) => setForm({ username })} />
          <Field label="Password" type="password" value={form.password} onChange={(password) => setForm({ password })} />
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button" type="submit">
            <UserRound size={18} />
            <span>Log In</span>
          </button>
        </form>
      </section>
    </main>
  );
}

function Dashboard({ view, items, data, role, dateFilter, dateRange, onDateFilterChange, onNavigate }) {
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

function SalesForm({ items, cart, onSubmit, onCartQty, onRemoveCartItem, onCheckout, onClearCart }) {
  const [form, setForm] = useForm({ Date: today, Item_ID: "", Qty_Sold: 1 });
  const [cartDate, setCartDate] = useState(today);
  const selected = items.find((item) => item.Item_ID === form.Item_ID);
  const itemMap = Object.fromEntries(items.map((item) => [item.Item_ID, item]));
  const cartRows = cart
    .map((entry) => ({ ...entry, item: itemMap[entry.Item_ID] }))
    .filter((entry) => entry.item);
  const cartTotal = cartRows.reduce((sum, entry) => sum + Number(entry.Qty_Sold || 0) * Number(entry.item.Selling_Price || 0), 0);

  return (
    <div className="split sales-layout">
      <FormPanel
        title="Record Single Sale"
        button="Save Sale"
        onSubmit={() => onSubmit(form, () => setForm({ Date: today, Item_ID: "", Qty_Sold: 1 }))}
      >
        <Field label="Date" type="date" value={form.Date} onChange={(Date) => setForm({ Date })} />
        <Select label="Item" value={form.Item_ID} onChange={(Item_ID) => setForm({ Item_ID })} options={items} />
        <Field label="Quantity Sold" type="number" value={form.Qty_Sold} onChange={(Qty_Sold) => setForm({ Qty_Sold })} />
        <div className="calculation">
          <span>Expected total</span>
          <strong>{money.format(Number(form.Qty_Sold || 0) * Number(selected?.Selling_Price || 0))}</strong>
        </div>
      </FormPanel>

      <section className="panel sale-cart-panel">
        <div className="panel-heading">
          <div>
            <h2>Sale Cart</h2>
            <span>{cartRows.length} items in basket</span>
          </div>
          <ShoppingCart size={18} />
        </div>
        <Field label="Sale Date" type="date" value={cartDate} onChange={setCartDate} />
        {cartRows.length ? (
          <>
            <div className="cart-list">
              {cartRows.map((entry) => (
                <article className="cart-row" key={entry.Item_ID}>
                  <div>
                    <strong>{entry.item.Item_Name}</strong>
                    <span>{money.format(Number(entry.item.Selling_Price || 0))} each</span>
                  </div>
                  <input
                    aria-label={`Quantity for ${entry.item.Item_Name}`}
                    min="1"
                    max={Number(entry.item.Current_Stock || 1)}
                    type="number"
                    value={entry.Qty_Sold}
                    onChange={(event) => onCartQty(entry.Item_ID, event.target.value)}
                  />
                  <strong>{money.format(Number(entry.Qty_Sold || 0) * Number(entry.item.Selling_Price || 0))}</strong>
                  <button className="icon-button" type="button" onClick={() => onRemoveCartItem(entry.Item_ID)} title="Remove from cart">
                    <Trash2 size={16} />
                  </button>
                </article>
              ))}
            </div>
            <div className="cart-total">
              <span>Total</span>
              <strong>{money.format(cartTotal)}</strong>
            </div>
            <div className="cart-actions">
              <button className="primary-button" type="button" onClick={() => onCheckout(cartDate)}>
                <ShoppingCart size={18} />
                <span>Save Basket Sale</span>
              </button>
              <button className="secondary-button" type="button" onClick={onClearCart}>
                <span>Clear</span>
              </button>
            </div>
          </>
        ) : (
          <EmptyState title="Cart is empty" message="Use Add to Cart from the item list to build a basket sale." />
        )}
      </section>
    </div>
  );
}

function StockForm({ items, suppliers, onSubmit }) {
  const [form, setForm] = useForm({ Date: today, Item_ID: "", Qty_Added: 1, Unit_Cost: 0, Supplier_ID: "", Invoice_No: "" });
  const activeSuppliers = suppliers.filter((supplier) => (supplier.Status || "Active") === "Active");

  return (
    <FormPanel
      title="Add Stock"
      button="Save Stock"
      onSubmit={() => onSubmit(form, () => setForm({ Date: today, Item_ID: "", Qty_Added: 1, Unit_Cost: 0, Supplier_ID: "", Invoice_No: "" }))}
    >
      <Field label="Date" type="date" value={form.Date} onChange={(Date) => setForm({ Date })} />
      <Select label="Item" value={form.Item_ID} onChange={(Item_ID) => setForm({ Item_ID })} options={items} />
      <SupplierSelect label="Supplier" value={form.Supplier_ID} onChange={(Supplier_ID) => setForm({ Supplier_ID })} options={activeSuppliers} />
      <Field label="Invoice No" value={form.Invoice_No} onChange={(Invoice_No) => setForm({ Invoice_No })} />
      <Field label="Quantity Added" type="number" value={form.Qty_Added} onChange={(Qty_Added) => setForm({ Qty_Added })} />
      <Field label="Unit Cost" type="number" value={form.Unit_Cost} onChange={(Unit_Cost) => setForm({ Unit_Cost })} />
      <div className="calculation">
        <span>Total cost</span>
        <strong>{money.format(Number(form.Qty_Added || 0) * Number(form.Unit_Cost || 0))}</strong>
      </div>
    </FormPanel>
  );
}

function SuppliersPanel({ suppliers, onSubmit, onUpdate }) {
  const [form, setForm] = useForm({ Supplier_Name: "", Phone: "", Status: "Active" });
  const [editingId, setEditingId] = useState("");
  const [editForm, setEditForm] = useForm({ Supplier_ID: "", Supplier_Name: "", Phone: "", Status: "Active" });

  function beginEdit(supplier) {
    setEditingId(supplier.Supplier_ID);
    setEditForm({
      Supplier_ID: supplier.Supplier_ID,
      Supplier_Name: supplier.Supplier_Name,
      Phone: supplier.Phone || "",
      Status: supplier.Status || "Active",
    });
  }

  function cancelEdit() {
    setEditingId("");
    setEditForm({ Supplier_ID: "", Supplier_Name: "", Phone: "", Status: "Active" });
  }

  function saveEdit(event) {
    event.preventDefault();
    onUpdate(editForm);
    cancelEdit();
  }

  return (
    <div className="split">
      <FormPanel
        title="Create Supplier"
        button="Add Supplier"
        onSubmit={() => onSubmit(form, () => setForm({ Supplier_Name: "", Phone: "", Status: "Active" }))}
      >
        <Field label="Supplier Name" value={form.Supplier_Name} onChange={(Supplier_Name) => setForm({ Supplier_Name })} />
        <Field label="Phone" value={form.Phone} onChange={(Phone) => setForm({ Phone })} />
        <StatusSelect label="Status" value={form.Status} onChange={(Status) => setForm({ Status })} />
      </FormPanel>
      <section className="panel">
        <div className="panel-heading">
          <h2>Supplier List</h2>
          <span>{suppliers.length} suppliers</span>
        </div>
        {suppliers.length ? (
          <div className="supplier-list">
            {suppliers.map((supplier) => (
              <article className="supplier-card" key={supplier.Supplier_ID}>
                {editingId === supplier.Supplier_ID ? (
                  <form className="supplier-edit-form" onSubmit={saveEdit}>
                    <Field label="Supplier Name" value={editForm.Supplier_Name} onChange={(Supplier_Name) => setEditForm({ Supplier_Name })} />
                    <Field label="Phone" value={editForm.Phone} onChange={(Phone) => setEditForm({ Phone })} />
                    <StatusSelect label="Status" value={editForm.Status} onChange={(Status) => setEditForm({ Status })} />
                    <div className="category-actions">
                      <button className="primary-button compact-button" type="submit">
                        <span>Update</span>
                      </button>
                      <button className="secondary-button" type="button" onClick={cancelEdit}>
                        <span>Cancel</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div>
                      <strong>{supplier.Supplier_Name}</strong>
                      <span>{supplier.Supplier_ID}</span>
                    </div>
                    <span>{supplier.Phone || "-"}</span>
                    <StatusBadge status={supplier.Status || "Active"} />
                    <button className="secondary-button" type="button" onClick={() => beginEdit(supplier)}>
                      <span>Edit</span>
                    </button>
                  </>
                )}
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="No suppliers yet" message="Add suppliers before recording stock purchases." />
        )}
      </section>
    </div>
  );
}

function StockHistoryPanel({ movements, items }) {
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

function SalesHistoryPanel({ sales, items }) {
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
                  <span>{group.date}</span>
                </div>
                <span>{group.items} lines</span>
                <span>{group.quantity} qty</span>
                <strong>{money.format(group.total)}</strong>
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
          columns={["Date", "Receipt", "Item", "Qty", "Unit", "Total"]}
          rows={filteredSales
            .slice()
            .reverse()
            .map((sale) => [
              sale.Date,
              sale.Receipt_No || sale.Sale_ID,
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

function ItemsPanel({ items, categories, role, onSubmit, onUpdate, onAddToCart }) {
  const [mode, setMode] = useState("list");
  const [editingId, setEditingId] = useState("");
  const [listOptions, setListOptions] = useState({ status: "all", category: "all", sort: "name" });
  const [editForm, setEditForm] = useForm({
    Item_ID: "",
    Item_Name: "",
    Category_ID: "",
    Cost_Price: 0,
    Selling_Price: 0,
    Current_Stock: 0,
    Status: "Active",
  });
  const activeCategories = categories.filter((category) => (category.Status || "Active") === "Active");
  const categoryOptions = categories.length ? categories : activeCategories;
  const canManageItems = role === "manager";
  const [form, setForm] = useForm({
    Item_Name: "",
    Category_ID: "",
    Cost_Price: 0,
    Selling_Price: 0,
    Current_Stock: 0,
    Status: "Active",
  });
  const visibleItems = useMemo(() => {
    const nextItems = items.filter((item) => {
      const statusMatches = listOptions.status === "all" || (item.Status || "Active") === listOptions.status;
      const categoryMatches = listOptions.category === "all" || item.Category_ID === listOptions.category;
      return statusMatches && categoryMatches;
    });

    return [...nextItems].sort((first, second) => {
      if (listOptions.sort === "stock") {
        return Number(first.Current_Stock || 0) - Number(second.Current_Stock || 0);
      }
      if (listOptions.sort === "price") {
        return Number(second.Selling_Price || 0) - Number(first.Selling_Price || 0);
      }
      return String(first.Item_Name || "").localeCompare(String(second.Item_Name || ""));
    });
  }, [items, listOptions]);

  function beginEdit(item) {
    setEditingId(item.Item_ID);
    setEditForm({
      Item_ID: item.Item_ID,
      Item_Name: item.Item_Name,
      Category_ID: item.Category_ID,
      Cost_Price: item.Cost_Price || 0,
      Selling_Price: item.Selling_Price || 0,
      Current_Stock: item.Current_Stock || 0,
      Status: item.Status || "Active",
    });
  }

  function saveEdit(event) {
    event.preventDefault();
    onUpdate(editForm);
    setEditingId("");
  }

  if (mode === "create") {
    return (
      <form
        className="panel item-form-panel"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(form, () => {
            setForm({ Item_Name: "", Category_ID: "", Cost_Price: 0, Selling_Price: 0, Current_Stock: 0, Status: "Active" });
            setMode("list");
          });
        }}
      >
        <div className="panel-heading item-form-heading">
          <div>
            <h2>Create Item</h2>
            <span>Add spare parts with price and opening stock.</span>
          </div>
          <button className="secondary-button" type="button" onClick={() => setMode("list")}>
            <span>Item List</span>
          </button>
        </div>
        <div className="item-form-grid">
          <Field label="Item Name" value={form.Item_Name} onChange={(Item_Name) => setForm({ Item_Name })} />
          <Select label="Category" value={form.Category_ID} onChange={(Category_ID) => setForm({ Category_ID })} options={activeCategories} category />
          <Field label="Cost Price" type="number" value={form.Cost_Price} onChange={(Cost_Price) => setForm({ Cost_Price })} />
          <Field label="Selling Price" type="number" value={form.Selling_Price} onChange={(Selling_Price) => setForm({ Selling_Price })} />
          <Field label="Opening Stock" type="number" value={form.Current_Stock} onChange={(Current_Stock) => setForm({ Current_Stock })} />
          <StatusSelect label="Status" value={form.Status} onChange={(Status) => setForm({ Status })} />
        </div>
        <div className="item-form-summary">
          <div>
            <span>Expected profit per item</span>
            <strong>{money.format(Number(form.Selling_Price || 0) - Number(form.Cost_Price || 0))}</strong>
          </div>
          <button className="primary-button" type="submit">
            <Plus size={18} />
            <span>Add Item</span>
          </button>
        </div>
      </form>
    );
  }

  return (
    <section className="panel">
      <div className="panel-heading item-list-heading">
        <div>
          <h2>Item List</h2>
          <span>{visibleItems.length} of {items.length} items</span>
        </div>
        <button className="primary-button compact-button" type="button" onClick={() => setMode("create")}>
          <Plus size={18} />
          <span>Create Item</span>
        </button>
      </div>
      {items.length ? (
        <>
          <div className="item-list-controls">
            {canManageItems && (
              <label>
                <span>Status</span>
                <select value={listOptions.status} onChange={(event) => setListOptions((current) => ({ ...current, status: event.target.value }))}>
                  <option value="all">All</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </label>
            )}
            <label>
              <span>Category</span>
              <select value={listOptions.category} onChange={(event) => setListOptions((current) => ({ ...current, category: event.target.value }))}>
                <option value="all">All categories</option>
                {categories.map((category) => (
                  <option key={category.Category_ID} value={category.Category_ID}>
                    {category.Category_Name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Sort</span>
              <select value={listOptions.sort} onChange={(event) => setListOptions((current) => ({ ...current, sort: event.target.value }))}>
                <option value="name">Name A-Z</option>
                <option value="stock">Lowest stock</option>
                <option value="price">Highest price</option>
              </select>
            </label>
          </div>
          {visibleItems.length ? (
            <div className="item-card-list">
              {visibleItems.map((item) => (
            <article className={canManageItems ? "item-card" : "item-card sales-item-card"} key={item.Item_ID}>
              {editingId === item.Item_ID ? (
                <form className="item-edit-form" onSubmit={saveEdit}>
                  <Field label="Item Name" value={editForm.Item_Name} onChange={(Item_Name) => setEditForm({ Item_Name })} />
                  <Select label="Category" value={editForm.Category_ID} onChange={(Category_ID) => setEditForm({ Category_ID })} options={categoryOptions} category />
                  <Field label="Cost Price" type="number" value={editForm.Cost_Price} onChange={(Cost_Price) => setEditForm({ Cost_Price })} />
                  <Field label="Selling Price" type="number" value={editForm.Selling_Price} onChange={(Selling_Price) => setEditForm({ Selling_Price })} />
                  <Field label="Stock" type="number" value={editForm.Current_Stock} onChange={(Current_Stock) => setEditForm({ Current_Stock })} />
                  <StatusSelect label="Status" value={editForm.Status} onChange={(Status) => setEditForm({ Status })} />
                  <div className="edit-actions">
                    <button className="primary-button compact-button" type="submit">
                      <span>Save</span>
                    </button>
                    <button className="secondary-button compact-button" type="button" onClick={() => setEditingId("")}>
                      <span>Cancel</span>
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div>
                    <strong>{item.Item_Name}</strong>
                    <span>{item.Item_ID}</span>
                  </div>
                  <div>
                    <span>Stock</span>
                    <StockBadge value={Number(item.Current_Stock || 0)} />
                  </div>
                  <div>
                    <span>Cost</span>
                    <strong>{money.format(Number(item.Cost_Price || 0))}</strong>
                  </div>
                  <div className="item-price-cell">
                    <span>Price</span>
                    <strong>{money.format(Number(item.Selling_Price || 0))}</strong>
                  </div>
                  <StatusBadge status={item.Status || "Active"} />
                  {(item.Status || "Active") === "Active" && Number(item.Current_Stock || 0) > 0 && (
                    <button className="primary-button compact-button item-cart-button" type="button" onClick={() => onAddToCart(item)} title="Add to sale cart">
                      <ShoppingCart size={15} />
                      <span>Add</span>
                    </button>
                  )}
                  {canManageItems && (
                    <button className="secondary-button compact-button item-edit-button" type="button" onClick={() => beginEdit(item)} title="Edit item">
                      <Pencil size={15} />
                      <span>Edit</span>
                    </button>
                  )}
                </>
              )}
            </article>
              ))}
            </div>
          ) : (
            <EmptyState title="No matching items" message="Change the filter or search text to show more items." />
          )}
        </>
      ) : (
        <EmptyState
          title="No items created"
          message="Your items will appear here after you add the first spare part."
          actionLabel="Create Item"
          onAction={() => setMode("create")}
        />
      )}
    </section>
  );
}

function ExpensesPanel({ expenses, onSubmit }) {
  const [form, setForm] = useForm({ Date: today, Description: "", Amount: 0 });
  return (
    <div className="split">
      <FormPanel
        title="Record Expense"
        button="Save Expense"
        onSubmit={() => onSubmit(form, () => setForm({ Date: today, Description: "", Amount: 0 }))}
      >
        <Field label="Date" type="date" value={form.Date} onChange={(Date) => setForm({ Date })} />
        <Field label="Description" value={form.Description} onChange={(Description) => setForm({ Description })} />
        <Field label="Amount" type="number" value={form.Amount} onChange={(Amount) => setForm({ Amount })} />
      </FormPanel>
      <section className="panel">
        <div className="panel-heading">
          <h2>Expense Log</h2>
          <span>{money.format(expenses.reduce((sum, item) => sum + Number(item.Amount || 0), 0))}</span>
        </div>
        <Table columns={["Date", "Description", "Amount"]} rows={expenses.slice(-8).reverse().map((expense) => [expense.Date, expense.Description, money.format(Number(expense.Amount || 0))])} />
      </section>
    </div>
  );
}

function CategoriesPanel({ categories, onSubmit, onUpdate }) {
  const [form, setForm] = useForm({ Category_Name: "", Status: "Active" });
  const [editingId, setEditingId] = useState("");
  const [editForm, setEditForm] = useForm({ Category_ID: "", Category_Name: "", Status: "Active" });

  function beginEdit(category) {
    setEditingId(category.Category_ID);
    setEditForm({
      Category_ID: category.Category_ID,
      Category_Name: category.Category_Name,
      Status: category.Status || "Active",
    });
  }

  function cancelEdit() {
    setEditingId("");
    setEditForm({ Category_ID: "", Category_Name: "", Status: "Active" });
  }

  function saveEdit(event) {
    event.preventDefault();
    onUpdate(editForm);
    cancelEdit();
  }

  return (
    <div className="category-layout">
      <FormPanel
        title="Create Category"
        button="Add Category"
        onSubmit={() => onSubmit(form, () => setForm({ Category_Name: "", Status: "Active" }))}
      >
        <Field label="Category Name" value={form.Category_Name} onChange={(Category_Name) => setForm({ Category_Name })} />
        <label className="field">
          <span>Status</span>
          <select value={form.Status} onChange={(event) => setForm({ Status: event.target.value })}>
            <option>Active</option>
            <option>Inactive</option>
          </select>
        </label>
      </FormPanel>
      <section className="panel">
        <div className="panel-heading item-list-heading">
          <div>
            <h2>Category List</h2>
            <span>{categories.length} categories</span>
          </div>
        </div>
        {categories.length ? (
          <div className="category-list">
            {categories.map((category) => {
              const isEditing = editingId === category.Category_ID;
              return (
                <article className="category-card" key={category.Category_ID}>
                  {isEditing ? (
                    <form className="category-edit-form" onSubmit={saveEdit}>
                      <Field
                        label="Category Name"
                        value={editForm.Category_Name}
                        onChange={(Category_Name) => setEditForm({ Category_Name })}
                      />
                      <label className="field">
                        <span>Status</span>
                        <select value={editForm.Status} onChange={(event) => setEditForm({ Status: event.target.value })}>
                          <option>Active</option>
                          <option>Inactive</option>
                        </select>
                      </label>
                      <div className="category-actions">
                        <button className="primary-button compact-button" type="submit">
                          <span>Update</span>
                        </button>
                        <button className="secondary-button" type="button" onClick={cancelEdit}>
                          <span>Cancel</span>
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div>
                        <strong>{category.Category_Name}</strong>
                        <span>{category.Category_ID}</span>
                      </div>
                      <StatusBadge status={category.Status || "Active"} />
                      <button className="secondary-button" type="button" onClick={() => beginEdit(category)}>
                        <span>Edit</span>
                      </button>
                    </>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState title="No categories created" message="Create categories first, then attach items to them." />
        )}
      </section>
    </div>
  );
}

function SettingsPanel({ users, onSave, onCheckConnection }) {
  const [form, setForm] = useState(() => ({
    managerName: users.find((user) => user.role === "manager")?.name || "Manager",
    managerUsername: users.find((user) => user.role === "manager")?.username || "",
    managerPassword: users.find((user) => user.role === "manager")?.password || "",
    salesName: users.find((user) => user.role === "sales")?.name || "Sales Representative",
    salesUsername: users.find((user) => user.role === "sales")?.username || "",
    salesPassword: users.find((user) => user.role === "sales")?.password || "",
  }));
  const [message, setMessage] = useState("");
  const [connectionMessage, setConnectionMessage] = useState("");
  const [checkingConnection, setCheckingConnection] = useState(false);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function saveSettings(event) {
    event.preventDefault();
    const required = [
      form.managerName,
      form.managerUsername,
      form.managerPassword,
      form.salesName,
      form.salesUsername,
      form.salesPassword,
    ];

    if (required.some((value) => !String(value).trim())) {
      setMessage("All login fields are required.");
      return;
    }

    if (form.managerUsername.trim().toLowerCase() === form.salesUsername.trim().toLowerCase()) {
      setMessage("Manager and sales usernames must be different.");
      return;
    }

    onSave([
      {
        role: "manager",
        name: form.managerName.trim(),
        username: form.managerUsername.trim(),
        password: form.managerPassword,
      },
      {
        role: "sales",
        name: form.salesName.trim(),
        username: form.salesUsername.trim(),
        password: form.salesPassword,
      },
    ]);
    setMessage("Credentials saved successfully.");
  }

  async function testConnection() {
    setCheckingConnection(true);
    setConnectionMessage("Checking connection...");
    try {
      const result = await onCheckConnection();
      setConnectionMessage(result.demo ? result.message : result.message || "Google Sheets connection is working.");
    } catch (error) {
      setConnectionMessage(error.message);
    } finally {
      setCheckingConnection(false);
    }
  }

  return (
    <form className="settings-grid" onSubmit={saveSettings}>
      <section className="panel settings-actions connection-card">
        <div>
          <h2>Google Sheets Connection</h2>
          <p>Test this before creating real items, categories, stock, sales, or expenses.</p>
          {connectionMessage && <span>{connectionMessage}</span>}
        </div>
        <button className="secondary-button" type="button" onClick={testConnection} disabled={checkingConnection}>
          <RefreshCw size={18} />
          <span>{checkingConnection ? "Checking..." : "Test Connection"}</span>
        </button>
      </section>

      <section className="panel settings-card">
        <div className="panel-heading">
          <div>
            <h2>Manager Login</h2>
            <span>Full access to dashboard, stock, expenses, categories, and settings.</span>
          </div>
          <ShieldCheck size={20} />
        </div>
        <Field label="Display Name" value={form.managerName} onChange={(managerName) => update("managerName", managerName)} />
        <Field label="Username" value={form.managerUsername} onChange={(managerUsername) => update("managerUsername", managerUsername)} />
        <Field label="Password" type="password" value={form.managerPassword} onChange={(managerPassword) => update("managerPassword", managerPassword)} />
      </section>

      <section className="panel settings-card">
        <div className="panel-heading">
          <div>
            <h2>Sales Login</h2>
            <span>Limited access for recording sales and viewing items.</span>
          </div>
          <UserRound size={20} />
        </div>
        <Field label="Display Name" value={form.salesName} onChange={(salesName) => update("salesName", salesName)} />
        <Field label="Username" value={form.salesUsername} onChange={(salesUsername) => update("salesUsername", salesUsername)} />
        <Field label="Password" type="password" value={form.salesPassword} onChange={(salesPassword) => update("salesPassword", salesPassword)} />
      </section>

      <section className="panel settings-actions">
        <div>
          <h2>Save Login Credentials</h2>
          <p>Updated credentials are saved on this browser. For hosted multi-user security, connect server-side authentication later.</p>
          {message && <span>{message}</span>}
        </div>
        <button className="primary-button" type="submit">
          <Settings size={18} />
          <span>Save Settings</span>
        </button>
      </section>
    </form>
  );
}

function Metric({ title, value }) {
  return (
    <section className="metric">
      <span>{title}</span>
      <strong>{value}</strong>
    </section>
  );
}

function EmptyState({ title, message, actionLabel, onAction }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <span>{message}</span>
      {actionLabel && (
        <button className="secondary-button" type="button" onClick={onAction}>
          <Plus size={16} />
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
}

function FormPanel({ title, button, children, onSubmit }) {
  return (
    <form
      className="panel form-panel"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="panel-heading">
        <h2>{title}</h2>
        <Plus size={18} />
      </div>
      {children}
      <button className="primary-button" type="submit">
        <Plus size={18} />
        <span>{button}</span>
      </button>
    </form>
  );
}

function Field({ label, value, onChange, type = "text" }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type={type} value={value} min={type === "number" ? "0" : undefined} step={type === "number" ? "0.01" : undefined} onChange={(event) => onChange(event.target.value)} required />
    </label>
  );
}

function Select({ label, value, onChange, options, category = false }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} required>
        <option value="">Select {label.toLowerCase()}</option>
        {options.map((option) => (
          <option key={category ? option.Category_ID : option.Item_ID} value={category ? option.Category_ID : option.Item_ID}>
            {category ? option.Category_Name : option.Item_Name}
          </option>
        ))}
      </select>
    </label>
  );
}

function SupplierSelect({ label, value, onChange, options }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">No supplier selected</option>
        {options.map((supplier) => (
          <option key={supplier.Supplier_ID} value={supplier.Supplier_ID}>
            {supplier.Supplier_Name}
          </option>
        ))}
      </select>
    </label>
  );
}

function StatusSelect({ label, value, onChange }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} required>
        <option value="Active">Active</option>
        <option value="Inactive">Inactive</option>
      </select>
    </label>
  );
}

function DateFilterControl({ filter, range, onChange }) {
  return (
    <section className="panel date-filter-panel">
      <div>
        <h2>Report Date</h2>
        <span>{formatDateRange(range)}</span>
      </div>
      <div className="date-filter-options">
        {dateFilterOptions.map((option) => (
          <button
            key={option.id}
            className={filter.mode === option.id ? "filter-chip active" : "filter-chip"}
            type="button"
            onClick={() => onChange({ ...filter, mode: option.id })}
          >
            {option.label}
          </button>
        ))}
      </div>
      {filter.mode === "custom" && (
        <div className="custom-date-row">
          <Field label="Start Date" type="date" value={filter.start} onChange={(start) => onChange({ ...filter, start })} />
          <Field label="End Date" type="date" value={filter.end} onChange={(end) => onChange({ ...filter, end })} />
        </div>
      )}
    </section>
  );
}

function Table({ columns, rows }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length}>No records yet</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function StockBadge({ value }) {
  const className = value <= 10 ? "stock-badge low" : "stock-badge";
  return <span className={className}>{value}</span>;
}

function StatusBadge({ status }) {
  const normalized = status === "Inactive" ? "Inactive" : "Active";
  return <span className={normalized === "Active" ? "status-badge active" : "status-badge inactive"}>{normalized}</span>;
}

function useForm(initial) {
  const [form, setFormState] = useState(initial);
  const setForm = (patch) => setFormState((current) => ({ ...current, ...patch }));
  return [form, setForm];
}

function buildViewModel(data, dateRange) {
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

function getDateRange(filter) {
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

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toDateInput(date) {
  return date.toISOString().slice(0, 10);
}

function isDateInRange(date, range) {
  return date >= range.start && date <= range.end;
}

function formatDateRange(range) {
  return range.start === range.end ? range.start : `${range.start} to ${range.end}`;
}
