"use client";

import { Boxes, CircleDollarSign, ClipboardList, History, LayoutDashboard, PackagePlus, ReceiptText, Search, Settings, Tags, Truck } from "lucide-react";

export const today = new Date().toISOString().slice(0, 10);
export const money = new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" });
export const dateFilterOptions = [
  { id: "today", label: "Today" },
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
  { id: "custom", label: "Custom" },
];

export const tabs = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "sales", label: "Sales", icon: CircleDollarSign },
  { id: "inventory", label: "Inventory", icon: Boxes },
  { id: "salesHistory", label: "Sales History", icon: ClipboardList },
  { id: "aiSupply", label: "AI Supply Scan", icon: Search },
  { id: "stock", label: "Stock In", icon: PackagePlus },
  { id: "suppliers", label: "Suppliers", icon: Truck },
  { id: "history", label: "Stock History", icon: History },
  { id: "items", label: "Items", icon: Boxes },
  { id: "expenses", label: "Expenses", icon: ReceiptText },
  { id: "reports", label: "Reports", icon: ClipboardList },
  { id: "categories", label: "Categories", icon: Tags },
  { id: "settings", label: "Settings", icon: Settings },
];

export const defaultSettings = {
  manager_name: "Manager",
  manager_username: "manager",
  manager_password: "manager123",
  low_stock_limit: 10,
  shop_name: "WONSPAREPARTS",
  welcome_note: "Welcome to WONSPAREPARTS",
  thank_you_note: "Thank you for buying from WONSPAREPARTS. Please come again.",
};
export const emptyData = { settings: defaultSettings, categories: [], items: [], sales: [], stockIn: [], suppliers: [], movements: [], salesReps: [], expenses: [] };
export const defaultUsers = [
  { username: "manager", password: "manager123", role: "manager", name: "Manager" },
  { username: "sales", password: "sales123", role: "sales", name: "Sales Representative" },
];
export const roleTabs = {
  manager: tabs,
  sales: tabs.filter((tab) => ["dashboard", "sales", "items"].includes(tab.id)),
};
export const sidebarSections = {
  manager: [
    { label: "Main", items: tabs.filter((tab) => ["dashboard", "sales", "inventory", "expenses", "reports", "settings"].includes(tab.id)) },
  ],
  sales: [
    { label: "Work", items: tabs.filter((tab) => ["dashboard", "sales", "items"].includes(tab.id)) },
  ],
};

