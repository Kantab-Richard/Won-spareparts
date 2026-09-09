"use client";

import { useMemo, useState } from "react";
import { Boxes, Pencil, Plus, ShoppingCart } from "lucide-react";
import { money } from "../lib/constants";
import { EmptyState, Field, Select, StatusBadge, StatusSelect, StockBadge, useForm } from "./ui";

export function ItemsPanel({ items, categories, role, onSubmit, onUpdate, onAddToCart }) {
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

